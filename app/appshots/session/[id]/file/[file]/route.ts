// The tab collects an uploaded screenshot. Once: the relay forgets it on read.

import { cors, preflight } from "../../../../cors";
import { take, validSession } from "../../../../relay";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await params;
  if (!validSession(id) || !/^[\w-]{12}$/.test(file)) {
    return new Response("bad request", cors(request, { status: 400 }));
  }

  const bytes = await take(id, file);
  if (!bytes) return new Response("gone", cors(request, { status: 404 }));

  const type = bytes[0] === 0x89 ? "image/png" : "image/jpeg";
  return new Response(new Uint8Array(bytes), cors(request, { headers: { "Content-Type": type } }));
}

export const OPTIONS = preflight;
