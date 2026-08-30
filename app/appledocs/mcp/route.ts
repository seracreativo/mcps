// The Apple documentation MCP server, over HTTP.
//
// The path rules: mounted at /appledocs, the URL clients use is
// https://mcps.seracreativo.com/appledocs/mcp. Another server would be a
// sibling folder with its own /mcp.

import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import {
  Unavailable,
  asLines,
  frameworks,
  page,
  renderPage,
  search,
} from "../apple-doc";

/** A failure of Apple's endpoint is not a protocol failure: it gets reported. */
async function answering(work: () => Promise<string>) {
  try {
    return { content: [{ type: "text" as const, text: await work() }] };
  } catch (error) {
    const message =
      error instanceof Unavailable
        ? String(error.message)
        : `unexpected error: ${error}`;
    return { content: [{ type: "text" as const, text: message }], isError: true };
  }
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "apple_doc_page",
      "Read a page from Apple's official documentation: what it is, which " +
        "version of each platform it exists in, whether it is deprecated, how " +
        "it is declared and which symbols hang off it. Use it BEFORE claiming " +
        "what an Apple framework offers or what arguments a method takes. " +
        "Takes the whole URL, the path, or the symbol: 'swiftui/view', " +
        "'/documentation/swiftui/view' or the full URL.",
      { path: z.string().describe("Path or URL, e.g. 'swiftui/view'") },
      async ({ path }) => answering(async () => renderPage(await page(path))),
    );

    server.tool(
      "apple_doc_search",
      "Search for symbols inside a framework when you don't know the exact " +
        "name. Looks at the whole index (SwiftUI has over 8,000 paths) and " +
        "returns the ones containing the term. Then ask for the page with " +
        "apple_doc_page.",
      {
        term: z.string().describe("Part of the name to look for"),
        framework: z.string().describe("e.g. 'vision', 'swiftui'"),
      },
      async ({ term, framework }) =>
        answering(async () => {
          const hits = await search(term, framework);
          // Zero is a legitimate answer here, and it is said in words: an empty
          // list on its own would be indistinguishable from a failure.
          return hits.length
            ? asLines(hits)
            : `No matches for “${term}” in ${framework}.`;
        }),
    );

    server.tool(
      "apple_doc_frameworks",
      "List the frameworks Apple documents, with their path. Useful to find " +
        "out what one is called before searching inside it.",
      {},
      async () => answering(async () => asLines(await frameworks())),
    );
  },
  // Named: by default it introduces itself as "mcp-typescript server on
  // vercel", which is what whoever connects it sees.
  { serverInfo: { name: "appledocs", version: "1.0.0" } },
  { basePath: "/appledocs" },
);

export { handler as GET, handler as POST, handler as DELETE };
