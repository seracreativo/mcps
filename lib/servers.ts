// The registry of what this domain serves. Adding a server means adding an
// entry here and a folder `app/<slug>/mcp/route.ts`: the index, the server page
// and the connection commands all come out of this file.

import type { Lang } from "./i18n";

export const HOST = "https://mcps.seracreativo.com";

type Texto = Record<Lang, string>;

export type Server = {
  slug: string;
  name: Texto;
  tagline: Texto;
  /** `null` if the repository is private: a link to a 404 is worse than none. */
  repo: string | null;
  tools: { name: string; what: Texto }[];
};

export const SERVERS: Server[] = [
  {
    slug: "appledocs",
    name: { en: "Apple documentation", es: "Documentación de Apple" },
    tagline: {
      en: "So your agent reads the official docs before claiming what a framework offers or what arguments a method takes.",
      es: "Para que tu agente lea la documentación oficial antes de afirmar qué ofrece un framework o qué parámetros toma un método.",
    },
    repo: "https://github.com/seracreativo/mcps",
    tools: [
      {
        name: "apple_doc_page",
        what: {
          en: "One page: what it is, which OS versions it exists in, whether it is deprecated, and what hangs off it",
          es: "Una página: qué es, desde qué versión de cada plataforma existe, si está deprecada y qué símbolos cuelgan de ella",
        },
      },
      {
        name: "apple_doc_search",
        what: {
          en: "Search inside a framework when you don't know the exact name",
          es: "Buscar dentro de un framework cuando no sabes el nombre exacto",
        },
      },
      {
        name: "apple_doc_frameworks",
        what: {
          en: "The catalog of documented frameworks",
          es: "El catálogo de frameworks documentados",
        },
      },
    ],
  },
];

export const findServer = (slug: string) => SERVERS.find((s) => s.slug === slug);

export function commands(slug: string) {
  const url = `${HOST}/${slug}/mcp`;
  return [
    { client: "Claude Code", line: `claude mcp add --transport http ${slug} ${url}` },
    { client: "Codex", line: `codex mcp add ${slug} --url ${url}` },
    { client: "Cursor · Windsurf · VS Code", line: `"${slug}": { "url": "${url}" }` },
  ];
}
