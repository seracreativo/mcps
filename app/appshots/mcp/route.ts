// The appshots MCP server, over HTTP: https://mcps.seracreativo.com/appshots/mcp
//
// It holds no project. Each tool call is carried to the user's open editor tab
// through the relay, applied there with the editor's own rules, and the tab's
// answer comes back as the result.

import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
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
});

const position = z.number().int().min(1);
const set = position.describe("Section position, from 1");
const slide = position.describe("Screenshot position within its section, from 1");

const edit = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_text"), set, slide, headline: z.string().optional(), subheadline: z.string().optional() }),
  z.object({ op: z.literal("add_slides"), set, slides: z.array(slideText).min(1), at: position.optional() }),
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
        "words (about two lines). You cannot add images: screenshots you add are empty " +
        "slots the user fills by dragging an image in. Ids for devices, templates and " +
        "themes come from `options` in appshots_read.",
      { session, edits: z.array(edit).min(1) },
      async ({ session: code, edits }) =>
        relaying(code, { kind: "edit", edits }, ({ project }) => [json(project)]),
    );
  },
  { serverInfo: { name: "appshots", version: "1.0.0" } },
  { basePath: "/appshots" },
);

export { handler as GET, handler as POST, handler as DELETE };
