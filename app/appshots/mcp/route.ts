// The appshots MCP server, over HTTP: https://mcps.seracreativo.com/appshots/mcp
//
// It holds no project. Each tool call is carried to the user's open editor tab
// through the relay, applied there with the editor's own rules, and the tab's
// answer comes back as the result.

import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import { HOST } from "@/lib/servers";
import { NoReply, NotListening, dispatch } from "../relay";

export const maxDuration = 60;

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

type Reply =
  | {
      ok: true;
      project: unknown;
      previews?: { set: number; slide: number; mimeType: string; data: string }[];
    }
  | { ok: false; error: string };

const session = z
  .string()
  .describe("The session code the user copied from the editor (Claude → Connect), 20 characters");

/** A closed tab or a rejected change is not a protocol failure: it gets reported. */
async function relaying(code: string, command: unknown, render: (reply: Reply & { ok: true }) => Content[]) {
  const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

  try {
    const reply = (await dispatch(code, command)) as Reply;
    return reply.ok ? { content: render(reply) } : fail(reply.error);
  } catch (error) {
    if (error instanceof NotListening) {
      return fail(
        `No appshots editor is listening with session ${code}. Ask the user to open ` +
          "https://appshots.seracreativo.com, press Claude → Connect, and paste the new code: " +
          "the code changes on every connection and dies when the tab closes.",
      );
    }
    if (error instanceof NoReply) {
      return fail(
        "The editor tab did not answer in time: the user may have just disconnected or closed it. " +
          "Ask them to check the Claude button in the editor, and reconnect if needed.",
      );
    }
    return fail(`unexpected error: ${error}`);
  }
}

const json = (value: unknown): Content => ({ type: "text", text: JSON.stringify(value, null, 2) });

const slideText = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  template: z.string().optional().describe("Only if this screenshot leaves its section's composition"),
  screenshot: z.string().optional().describe("Id returned by the upload; without it, an empty slot the user fills"),
});

const position = z.number().int().min(1);
const set = position.describe("Section position, from 1");
const slide = position.describe("Screenshot position within its section, from 1");

const textStyle = z.object({
  size: z.number().optional().describe("Pixels at the section's export height, like the editor shows; range in style.sizeRange"),
  weight: z.number().int().optional().describe("One of options.weights"),
  align: z.enum(["left", "center", "right"]).optional(),
  lineHeight: z.number().optional(),
});

const edit = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_text"), set, slide, headline: z.string().optional(), subheadline: z.string().optional() }),
  z.object({ op: z.literal("add_slides"), set, slides: z.array(slideText).min(1), at: position.optional() }),
  z.object({ op: z.literal("set_screenshot"), set, slide, screenshot: z.string().describe("Id returned by the upload") }),
  z.object({ op: z.literal("remove_slide"), set, slide }),
  z.object({ op: z.literal("move_slide"), set, from: position, to: position }),
  z.object({
    op: z.literal("set_template"),
    set,
    slide: slide.optional(),
    template: z.string().nullable().describe("A template id; null returns a screenshot to its section's"),
  }),
  z.object({
    op: z.literal("set_device"),
    set,
    device: z.string().optional(),
    orientation: z.enum(["portrait", "landscape"]).optional(),
  }),
  z.object({
    op: z.literal("add_set"),
    family: z.enum(["iphone", "ipad", "mac", "watch"]),
    device: z.string().optional(),
    orientation: z.enum(["portrait", "landscape"]).optional(),
    template: z.string().optional(),
    slides: z.array(slideText).optional(),
  }),
  z.object({ op: z.literal("remove_set"), set }),
  z.object({ op: z.literal("set_theme"), theme: z.string() }),
  z.object({
    op: z.literal("set_style"),
    set,
    headline: textStyle.optional(),
    subheadline: textStyle.optional(),
    spacing: z
      .object({ margin: z.number().optional(), gap: z.number().optional(), textGap: z.number().optional() })
      .optional()
      .describe("margin and gap are fractions of the canvas height; textGap is in subheadline sizes"),
    rotation: z.number().optional().describe("Device tilt in degrees"),
    shadow: z.boolean().optional(),
    frame: z.enum(["auto", "portrait", "landscape"]).optional().describe("How the device is drawn; auto follows the screenshot"),
    reset: z.boolean().optional().describe("Back to what the template says, before applying the rest"),
  }),
  z.object({ op: z.literal("set_font"), font: z.string().describe("One of options.fonts") }),
  z.object({
    op: z.literal("set_colors"),
    background: z.string().optional(),
    text: z.string().optional(),
    frame: z.string().optional(),
  }).describe("Hex colors, #rrggbb"),
  z.object({
    op: z.literal("set_app"),
    name: z.string().optional(),
    subtitle: z.string().optional(),
    developer: z.string().optional(),
  }),
]);

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "appshots_read",
      "Read the App Store screenshot project open in the user's appshots editor: " +
        "sections by device, each screenshot's headline, export sizes, and the valid " +
        "devices, templates and themes under `options`. Returns a preview image of " +
        "every screenshot as the editor draws it, so you can see the app's screens " +
        "and check how your headlines fit. Read it before editing: the user may have " +
        "changed things by hand.",
      { session },
      async ({ session: code }) =>
        relaying(code, { kind: "read" }, ({ project, previews = [] }) => [
          json(project),
          ...previews.flatMap((p): Content[] => [
            { type: "text", text: `Section ${p.set} · screenshot ${p.slide}` },
            { type: "image", data: p.data, mimeType: p.mimeType },
          ]),
        ]),
    );

    server.tool(
      "appshots_edit",
      "Apply a list of changes to the project open in the user's appshots editor, " +
        "all or none; the user sees them live. Positions start at 1 and refer to the " +
        "state before each change in the list, so when removing or moving several, go " +
        "from last to first. A good headline says what that screen shows, in a few " +
        "words (about two lines).\n\n" +
        "Style is per section and shared by all its screenshots: sizes, weights, " +
        "alignment, spacing, tilt, shadow. Font and colors are per project. Valid ids " +
        "and ranges come from `options` and each section's `style` in appshots_read; " +
        "out of range is an error, not a clamp.\n\n" +
        "Images: with a shell, upload each PNG or JPEG first — " +
        `\`curl -s --data-binary @shot.png ${HOST}/appshots/session/<session>/upload\` — ` +
        "which answers {screenshot, w, h}; pass that `screenshot` id in add_slides or " +
        "set_screenshot. Without a shell, add slides without `screenshot` and ask " +
        "the user to drag the images into those slots.",
      { session, edits: z.array(edit).min(1) },
      async ({ session: code, edits }) =>
        relaying(code, { kind: "edit", edits }, ({ project }) => [json(project)]),
    );
  },
  { serverInfo: { name: "appshots", version: "1.0.0" } },
  { basePath: "/appshots" },
);

export { handler as GET, handler as POST, handler as DELETE };
