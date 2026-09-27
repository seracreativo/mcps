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
  /** The section under the tools: where the data comes from, or how it works. */
  about: { title: Texto; body: Texto };
  /** What is and isn't stored, and who is behind it. */
  footer: Texto;
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
    about: {
      title: { en: "Where the data comes from", es: "De dónde salen los datos" },
      body: {
        en: "developer.apple.com is a DocC app fed by JSON: every documentation page has a twin under /tutorials/data. They are queried live, cached for a day. They are not an official API and Apple has changed them before — so if this ever stops answering, that is why and not your network.",
        es: "developer.apple.com es una app DocC que se alimenta de JSON: cada página de documentación tiene su gemela en /tutorials/data. Se consultan en vivo, con un día de caché. No son una API oficial y Apple los ha cambiado antes, así que si un día deja de responder, es eso y no tu red.",
      },
    },
    footer: {
      en: "No authentication: Apple's documentation is public and nothing about you is stored here. A personal project, not affiliated with Apple Inc.",
      es: "Sin autenticación: la documentación de Apple es pública y aquí no se guarda nada de nadie. Proyecto personal, sin relación con Apple Inc.",
    },
  },
  {
    slug: "appshots",
    name: { en: "App Store screenshots", es: "Capturas para App Store" },
    tagline: {
      en: "So your agent writes the headlines, order and devices of your App Store screenshots while you watch them change in the appshots editor.",
      es: "Para que tu agente escriba los titulares, el orden y los dispositivos de tus capturas de App Store mientras las ves cambiar en el editor de appshots.",
    },
    repo: null,
    tools: [
      {
        name: "appshots_read",
        what: {
          en: "The open project: sections, headlines and export sizes, with a preview of every screenshot as the editor draws it",
          es: "El proyecto abierto: secciones, titulares y medidas de exportación, con una miniatura de cada captura tal como la pinta el editor",
        },
      },
      {
        name: "appshots_edit",
        what: {
          en: "Everything the editor does by hand — screenshots, headlines, order, devices, composition, style, font, colors, notes, the listing — applied all or none, live",
          es: "Todo lo que el editor hace a mano —capturas, titulares, orden, dispositivos, composición, estilo, fuente, colores, notas, la ficha— entero o nada, en directo",
        },
      },
      {
        name: "appshots_export",
        what: {
          en: "Download the ZIP for App Store Connect, one PNG, the social image or the .appshot, in the user's browser",
          es: "Descargar el ZIP para App Store Connect, un PNG, la imagen para redes o el .appshot, en el navegador del usuario",
        },
      },
    ],
    about: {
      title: { en: "How it works", es: "Cómo funciona" },
      body: {
        en: "Open appshots.seracreativo.com, press Claude → Connect and hand your agent the session code. The project never leaves your browser: this server only carries each change to your tab and the answer back, and forgets both within seconds. An agent with a shell uploads screenshots itself; without one, you drag them in.",
        es: "Abre appshots.seracreativo.com, pulsa Claude → Conectar y pásale a tu agente el código de sesión. El proyecto no sale de tu navegador: este servidor solo lleva cada cambio a tu pestaña y la respuesta de vuelta, y olvida las dos en segundos. Un agente con terminal sube las capturas él mismo; si no, las arrastras tú.",
      },
    },
    footer: {
      en: "No authentication: the session code is the key, and it dies when you disconnect or close the tab. Nothing is stored. A personal project, not affiliated with Apple Inc.",
      es: "Sin autenticación: el código de sesión es la llave, y muere al desconectar o cerrar la pestaña. No se guarda nada. Proyecto personal, sin relación con Apple Inc.",
    },
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
