// The tab's answer to one command. Stored only until the MCP reads it.

import { cors, preflight } from "../../../../cors";
import { answer, validSession } from "../../../../relay";

export const dynamic = "force-dynamic";

/** Ten previews are a few hundred KB; this leaves room and stops abuse. */
const MAX_BYTES = 4_000_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; command: string }> },
) {
  const { id, command } = await params;
  if (!validSession(id) || !/^[0-9a-f-]{36}$/.test(command)) {
    return new Response("bad session", cors(request, { status: 400 }));
  }

  const body = await request.text();
  if (body.length > MAX_BYTES) return new Response("too large", cors(request, { status: 413 }));

  await answer(id, command, body);
  return new Response(null, cors(request, { status: 204 }));
}

export const OPTIONS = preflight;
