// The editor calls the relay from the browser, so the relay has to say which
// origins may read its answers. Localhost is the editor's dev server.

const ORIGINS = ["https://appshots.seracreativo.com", "http://localhost:6900"];

export function cors(request: Request, init: ResponseInit = {}): ResponseInit {
  const origin = request.headers.get("origin");
  const headers = new Headers(init.headers);

  if (origin && ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin");
  }
  headers.set("Cache-Control", "no-store");

  return { ...init, headers };
}

export const preflight = (request: Request) => new Response(null, cors(request, { status: 204 }));
