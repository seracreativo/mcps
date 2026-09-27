// The tab collects an uploaded screenshot. Once: the relay forgets it on read.

import { cors, preflight } from "../../../../cors";
import { imageType } from "../../../../image";
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

  // The type matters: an SVG blob without it does not draw.
  const type = imageType(bytes) ?? "application/octet-stream";
  return new Response(new Uint8Array(bytes), cors(request, { headers: { "Content-Type": type } }));
}

export const OPTIONS = preflight;
