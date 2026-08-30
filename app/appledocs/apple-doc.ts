// Apple's documentation data, with no opinion on how it is presented.
//
// developer.apple.com is a DocC app rendered with JavaScript: downloading the
// page gives you an empty shell. The data comes from JSON endpoints, and every
// documentation URL has a twin:
//
//     developer.apple.com/documentation/X
//     developer.apple.com/tutorials/data/documentation/X.json

const BASE = "https://developer.apple.com/tutorials/data";

// Identifiable on purpose: these are internal endpoints, and the least we can
// do is say who is calling, so they can cut us off and not everyone else.
const UA = "apple-doc-mcp/1.0 (+https://github.com/seracreativo/mcps)";

// One day. Apple's docs change with the betas, not with the hours, and this
// serves everyone from a single IP: without a cache, a hundred people asking
// the same thing are a hundred requests to Apple with an identical answer.
const REVALIDATE = 86_400;

/** The endpoint didn't answer what it should. NOT the same as "there is nothing". */
export class Unavailable extends Error {}

async function fetchJson(url: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: REVALIDATE },
    });
  } catch (error) {
    throw new Unavailable(`No answer from ${url}: ${error}`);
  }

  if (response.status === 404) throw new Unavailable(`Not found: ${url}`);
  if (!response.ok) throw new Unavailable(`HTTP ${response.status} at ${url}`);

  try {
    return await response.json();
  } catch (error) {
    // The symptom of a changed schema, or of a captive portal in the way.
    // Swallowing it would let you believe the symbol doesn't exist.
    throw new Unavailable(`${url} did not return JSON: ${error}`);
  }
}

/** Takes the whole URL, the path with /documentation/, or just the symbol. */
export function normalise(path: string): string {
  let out = path.trim().replace("https://developer.apple.com", "");
  out = out.replace("/tutorials/data", "");
  out = out.replace(/^\/?documentation\//, "");
  out = out.replace(/^\/+|\/+$/g, "");
  return out.replace(/\.json$/, "").toLowerCase();
}

type Node = { path?: string; title?: string; children?: Node[] };
type Hit = { path: string; title: string };

function flatten(nodes: Node[] | undefined, out: Hit[] = []): Hit[] {
  for (const node of nodes ?? []) {
    if (node.path) out.push({ path: node.path, title: node.title ?? "" });
    flatten(node.children, out);
  }
  return out;
}

function text(fragments: { text?: string }[] | undefined): string {
  return (fragments ?? []).map((f) => f.text ?? "").join("");
}

async function nodesOf(framework: string): Promise<Node[]> {
  const data = await fetchJson(`${BASE}/index/${normalise(framework)}`);
  const languages = data.interfaceLanguages ?? {};
  const nodes = languages.swift ?? languages.occ;
  if (!nodes) {
    throw new Unavailable(
      `The index for ${framework} has no interfaceLanguages. ` +
        "The schema may have changed.",
    );
  }
  return nodes;
}

/** One page: what it is, since when, how it is declared, what hangs off it. */
export async function page(path: string) {
  const data = await fetchJson(`${BASE}/documentation/${normalise(path)}.json`);
  const meta = data.metadata ?? {};

  const platforms: string[] = [];
  for (const p of meta.platforms ?? []) {
    const mark = p.deprecated ? " DEPRECATED" : "";
    const beta = p.beta ? " beta" : "";
    platforms.push(`${p.name} ${p.introducedAt ?? ""}${mark}${beta}`.trim());
  }

  const declarations: string[] = [];
  const discussion: string[] = [];
  for (const section of data.primaryContentSections ?? []) {
    for (const decl of section.declarations ?? []) {
      const code = (decl.tokens ?? []).map((t: any) => t.text ?? "").join("");
      if (code) declarations.push(code);
    }
    for (const content of section.content ?? []) {
      if (content.type === "paragraph") {
        const line = text(content.inlineContent).trim();
        if (line) discussion.push(line);
      }
    }
  }

  const references = data.references ?? {};
  const topics: { title: string; items: { title: string; abstract: string }[] }[] = [];
  for (const section of data.topicSections ?? []) {
    const items = [];
    for (const identifier of section.identifiers ?? []) {
      const ref = references[identifier] ?? {};
      if (ref.title) {
        items.push({ title: ref.title, abstract: text(ref.abstract).trim() });
      }
    }
    if (items.length) topics.push({ title: section.title ?? "", items });
  }

  return {
    title: meta.title ?? "(untitled)",
    kind: meta.roleHeading ?? "",
    platforms,
    abstract: text(data.abstract).trim(),
    declarations,
    discussion,
    topics,
  };
}

/** Paths in a framework that contain the term. Zero is an answer. */
export async function search(term: string, framework: string): Promise<Hit[]> {
  const needle = term.toLowerCase();
  // Deduplicated because the index hangs the same symbol off several branches
  // —one per topic, another per hierarchy— and without this the same path shows
  // up five times and looks like five different things.
  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const hit of flatten(await nodesOf(framework))) {
    const matches =
      hit.path.toLowerCase().includes(needle) ||
      hit.title.toLowerCase().includes(needle);
    if (matches && !seen.has(hit.path)) {
      seen.add(hit.path);
      hits.push(hit);
    }
  }
  return hits;
}

export async function frameworks(): Promise<Hit[]> {
  const data = await fetchJson(`${BASE}/documentation/technologies.json`);
  const references: Record<string, any> = data.references ?? {};
  const seen = new Set<string>();
  const found: Hit[] = [];
  for (const ref of Object.values(references)) {
    const url: string = ref.url ?? "";
    if (ref.role !== "collection" || !url.startsWith("/documentation/")) continue;
    const path = url.replace("/documentation/", "");
    if (seen.has(path)) continue;
    seen.add(path);
    found.push({ path, title: ref.title ?? "" });
  }
  if (!found.length) {
    throw new Unavailable("technologies.json returned no frameworks.");
  }
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

export function renderPage(data: Awaited<ReturnType<typeof page>>): string {
  const out = [`# ${data.title}`];
  if (data.kind) out.push(data.kind);
  if (data.platforms.length) out.push(data.platforms.join(" · "));
  if (data.abstract) out.push("\n" + data.abstract);
  for (const code of data.declarations) out.push(`\n    ${code}`);
  for (const line of data.discussion) out.push(`\n${line}`);
  for (const topic of data.topics) {
    out.push(`\n## ${topic.title}`);
    for (const item of topic.items) {
      out.push(`  - ${item.title}${item.abstract ? ` — ${item.abstract}` : ""}`);
    }
  }
  return out.join("\n");
}

export const asLines = (hits: Hit[]) =>
  hits.map((h) => `${h.path}\t${h.title}`).join("\n");
