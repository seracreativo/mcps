# mcps.seracreativo.com

MCP servers over HTTP. Connecting one usually means cloning a repository,
installing it and registering a path on every machine that wants it. These are
served over HTTP instead: you paste a URL, and updating the server updates it
for everyone at once.

→ **[mcps.seracreativo.com](https://mcps.seracreativo.com)**

---

## `appledocs` — Apple's documentation

So your agent reads the official docs before claiming what a framework offers or
what arguments a method takes.

**Claude Code**

```bash
claude mcp add --transport http appledocs https://mcps.seracreativo.com/appledocs/mcp
```

**Codex**

```bash
codex mcp add appledocs --url https://mcps.seracreativo.com/appledocs/mcp
```

**Cursor · Windsurf · VS Code** — in your MCP config:

```json
{ "appledocs": { "url": "https://mcps.seracreativo.com/appledocs/mcp" } }
```

<details>
<summary>Tools it gives your agent</summary>

| Tool | What it does |
|---|---|
| `apple_doc_page` | One page: what it is, which OS versions it exists in, whether it is deprecated, how it is declared and what hangs off it |
| `apple_doc_search` | Search inside a framework when you don't know the exact name — SwiftUI alone has over 8,000 paths |
| `apple_doc_frameworks` | The catalog of documented frameworks |

</details>

<details>
<summary>Where its data comes from</summary>

`developer.apple.com` is a DocC app fed by JSON: every `/documentation/X` has a
twin at `/tutorials/data/documentation/X.json`.

**These are internal endpoints with no guarantees** — Apple has changed them
before. When one breaks, the server says so (`did not return JSON`) instead of
pretending the symbol doesn't exist. If this ever stops answering, that's why.

Not affiliated with Apple Inc.

</details>

---

## How this is built

**No authentication, on purpose.** What is served here is public, so there is
nothing to protect and nothing about you is stored. That is exactly what lets
installing be a single line, with no OAuth in the way.

**The cache is not an optimization.** It is what makes serving this from one IP
viable: without it, a hundred people asking the same question are a hundred
identical upstream requests, and the block would arrive on its own. One day of
`revalidate`, because Apple's docs change with the betas, not with the hours.

## Adding a server

Two things, and the site takes care of the rest:

1. An entry in `lib/servers.ts` — name, tagline, tools, repo.
2. A folder `app/<slug>/mcp/route.ts` whose `basePath` matches the folder.

The index at `/`, the server's own page at `/<slug>` and the three connection
commands above are all generated from that registry, in both languages.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
```

Checking a server without a client — a bare `initialize`:

```bash
curl -s -X POST http://localhost:3000/appledocs/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
```

The site speaks English by default and Spanish on request; the code, its
comments and this README are in English, because the repository is public.
