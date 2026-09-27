// An agent with a shell uploads a local screenshot here:
//
//   curl -s --data-binary @shot.png https://mcps.seracreativo.com/appshots/session/<code>/upload
//
// The bytes are handed to the tab, and the answer — an id to use in
// appshots_edit, plus the image's size — comes back once the tab has them.

import { randomBytes } from "node:crypto";
import { imageType } from "../../../image";
import { NoReply, NotListening, Outdated, dispatch, listening, stash, take, validSession } from "../../../relay";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel rejects bodies over 4.5 MB before this code runs; this says why in words. */
const MAX_BYTES = 4_400_000;

const fail = (status: number, error: string) => Response.json({ error }, { status });

const OUTDATED = "The editor tab runs an older version. Ask the user to reload it; the session and project are kept.";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validSession(id)) return fail(400, "Not a session code.");

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > MAX_BYTES) {
    return fail(
      413,
      "Over 4.4 MB. Convert it to JPEG first, e.g. on macOS: " +
        "sips -s format jpeg -s formatOptions 90 shot.png --out shot.jpg",
    );
  }
  if (!imageType(bytes)) {
    return fail(415, "Only PNG, JPEG, WebP or SVG. Send the raw file with --data-binary @path, not a form.");
  }

  // Before storing anything: with no tab to collect it, the image would sit
  // in Redis until it expired.
  try {
    await listening(id);
  } catch (error) {
    if (error instanceof Outdated) return fail(409, OUTDATED);
    return fail(409, `No editor is listening with session ${id}.`);
  }

  const file = randomBytes(9).toString("base64url");

  try {
    await stash(id, file, bytes);
    const reply = (await dispatch(id, { kind: "file", file })) as
      | { ok: true; image: { w: number; h: number } }
      | { ok: false; error: string };

    return reply.ok
      ? Response.json({ screenshot: file, ...reply.image })
      : fail(422, reply.error);
  } catch (error) {
    // Not collected: it goes now rather than when it expires.
    await take(id, file);
    if (error instanceof NotListening) return fail(409, `No editor is listening with session ${id}.`);
    if (error instanceof Outdated) return fail(409, OUTDATED);
    if (error instanceof NoReply) return fail(504, "The editor did not collect the image in time.");
    throw error;
  }
}
