// An agent with a shell uploads a local screenshot here:
//
//   curl -s --data-binary @shot.png https://mcps.seracreativo.com/appshots/session/<code>/upload
//
// The bytes are handed to the tab, and the answer — an id to use in
// appshots_edit, plus the image's size — comes back once the tab has them.

import { randomBytes } from "node:crypto";
import { NoReply, NotListening, dispatch, listening, stash, take, validSession } from "../../../relay";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel rejects bodies over 4.5 MB before this code runs; this says why in words. */
const MAX_BYTES = 4_400_000;

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const starts = (bytes: Buffer, magic: number[]) => magic.every((b, i) => bytes[i] === b);

const fail = (status: number, error: string) => Response.json({ error }, { status });

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
  if (!starts(bytes, PNG) && !starts(bytes, JPEG)) {
    return fail(415, "Only PNG or JPEG. Send the raw file with --data-binary @path, not a form.");
  }

  // Before storing anything: with no tab to collect it, the image would sit
  // in Redis until it expired.
  if (!(await listening(id))) return fail(409, `No editor is listening with session ${id}.`);

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
    if (error instanceof NoReply) return fail(504, "The editor did not collect the image in time.");
    throw error;
  }
}
