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
    star: "Star it on GitHub",
    noAuth: "No authentication, and nothing about you is stored here. A personal project.",
    other: "Español",
  },
  es: {
    tagline: "Servidores MCP servidos por HTTP. Se conectan pegando una URL: nada que clonar, nada que instalar, nada que actualizar.",
    servers: "Servidores",
    open: "Ver ficha",
    connect: "Cómo se conecta",
    tools: "Qué le da a tu agente",
    star: "Dale una estrella en GitHub",
    noAuth: "Sin autenticación, y aquí no se guarda nada de nadie. Proyecto personal.",
    other: "English",
  },
} satisfies Record<Lang, Record<string, string>>;
