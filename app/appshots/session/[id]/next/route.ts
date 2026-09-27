// The tab asks for its next command. Held open until one arrives or the poll
// times out, which answers 204 and the tab asks again.

import { cors, preflight } from "../../../cors";
import { listen, validSession } from "../../../relay";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validSession(id)) return new Response("bad session", cors(request, { status: 400 }));

  const command = await listen(id);
  return command
    ? new Response(command, cors(request, { headers: { "Content-Type": "application/json" } }))
    : new Response(null, cors(request, { status: 204 }));
}

export const OPTIONS = preflight;
