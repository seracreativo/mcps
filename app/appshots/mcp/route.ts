// The appshots MCP server, over HTTP: https://mcps.seracreativo.com/appshots/mcp
//
// It holds no project. Each tool call is carried to the user's open editor tab
// through the relay, applied there with the editor's own rules, and the tab's
// answer comes back as the result. The user sees every change as it happens.

import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import { HOST } from "@/lib/servers";
import { NoReply, NotListening, dispatch } from "../relay";
import { edit } from "../schema";

export const maxDuration = 60;

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

type Reply =
  | {
      ok: true;
      project?: unknown;
      previews?: { set: number; slide: number; mimeType: string; data: string }[];
      file?: { name: string; bytes: number };
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

const UPLOAD = `${HOST}/appshots/session/<session>/upload`;

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "appshots_read",
      "Read the App Store screenshot project open in the user's appshots editor: " +
        "sections by device, each screenshot's headline and notes, the style of each " +
        "section, the App Store listing, and under `options` every valid id and range. " +
        "Returns a preview image of every screenshot as the editor draws it, so you can " +
        "see the screens, check how headlines fit and where notes landed. Read it before " +
        "editing: the user may have changed things by hand.",
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
      "Apply a list of changes to the project open in the user's appshots editor, all or " +
        "none; the user sees them live. Anything the editor does by hand: screenshots, " +
        "headlines, order, sections and devices, composition, style, font, colors, notes " +
        "over a screenshot, the App Store listing, starting over. Positions start at 1 and " +
        "refer to the state before each change in the list, so when removing or moving " +
        "several, go from last to first. Out of range is an error, not a clamp.\n\n" +
        "Headlines say what that screen shows, in a few words. A note quotes something " +
        "visible on the screen behind it — a figure, a streak, a label — rather than " +
        "advertising: it is evidence the app does what it says.\n\n" +
        `Images (screenshots, the app icon, media notes): with a shell, upload a PNG, JPEG, ` +
        `WebP or SVG first — \`curl -s --data-binary @file.png ${UPLOAD}\` — which answers ` +
        "{screenshot, w, h}; pass that id where an image goes. Without a shell, add slides " +
        "without `screenshot` and ask the user to drag the images in.",
      { session, edits: z.array(edit).min(1) },
      async ({ session: code, edits }) =>
        relaying(code, { kind: "edit", edits }, ({ project }) => [json(project)]),
    );

    server.tool(
      "appshots_export",
      "Export from the user's editor; the file downloads in their browser, exactly as the " +
        "editor's own buttons do. `zip`: every section, at the sizes App Store Connect " +
        "accepts. `png`: one screenshot. `social`: an image of the listing for social " +
        "media, in one of options.socialFormats. `project`: the .appshot file, to keep " +
        "working later.",
      {
        session,
        what: z.enum(["zip", "png", "social", "project"]),
        set: z.number().int().min(1).optional().describe("png and social; default 1"),
        slide: z.number().int().min(1).optional().describe("png; default 1"),
        format: z.string().optional().describe("social; default 'wide'"),
      },
      async ({ session: code, ...command }) =>
        relaying(code, { kind: "export", ...command }, ({ file }) => [
          json({ downloaded: file?.name, bytes: file?.bytes }),
        ]),
    );
  },
  { serverInfo: { name: "appshots", version: "1.1.0" } },
  { basePath: "/appshots" },
);

export { handler as GET, handler as POST, handler as DELETE };
