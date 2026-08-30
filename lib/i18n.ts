// Two languages and two pages: a dictionary and a function are enough. An i18n
// library here would be more configuration than text.
//
// English leads because this page gets shared and whoever receives it may be
// anywhere; Spanish is here because it is the language of whoever writes it.

export type Lang = "en" | "es";

/** Whatever the URL asks for; else what the browser sends; else English. */
export function pickLang(param: string | undefined, header: string | null): Lang {
  if (param === "es" || param === "en") return param;
  return header?.toLowerCase().startsWith("es") ? "es" : "en";
}

export const copy = {
  en: {
    tagline: "MCP servers over HTTP. Connect one by pasting a URL — nothing to clone, nothing to install, nothing to update.",
    servers: "Servers",
    open: "Details",
    connect: "Connect it",
    tools: "What it gives your agent",
    source: "Where the data comes from",
    sourceBody:
      "developer.apple.com is a DocC app fed by JSON: every documentation page has a twin under /tutorials/data. They are queried live, cached for a day. They are not an official API and Apple has changed them before — so if this ever stops answering, that is why and not your network.",
    star: "Star it on GitHub",
    noAuth:
      "No authentication: Apple's documentation is public and nothing about you is stored here. A personal project, not affiliated with Apple Inc.",
    other: "Español",
  },
  es: {
    tagline: "Servidores MCP servidos por HTTP. Se conectan pegando una URL: nada que clonar, nada que instalar, nada que actualizar.",
    servers: "Servidores",
    open: "Ver ficha",
    connect: "Cómo se conecta",
    tools: "Qué le da a tu agente",
    source: "De dónde salen los datos",
    sourceBody:
      "developer.apple.com es una app DocC que se alimenta de JSON: cada página de documentación tiene su gemela en /tutorials/data. Se consultan en vivo, con un día de caché. No son una API oficial y Apple los ha cambiado antes, así que si un día deja de responder, es eso y no tu red.",
    star: "Dale una estrella en GitHub",
    noAuth:
      "Sin autenticación: la documentación de Apple es pública y aquí no se guarda nada de nadie. Proyecto personal, sin relación con Apple Inc.",
    other: "English",
  },
} satisfies Record<Lang, Record<string, string>>;
