// The index: what this domain serves. Each server links to its own page, where
// the connection commands live.

import { headers } from "next/headers";
import { copy, pickLang } from "@/lib/i18n";
import { SERVERS } from "@/lib/servers";
import { Styles } from "./styles";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: asked } = await searchParams;
  const lang = pickLang(asked, (await headers()).get("accept-language"));
  const t = copy[lang];

  return (
    <main className="wrap">
      <Styles />
      <div className="top">
        <h1>mcps.seracreativo.com</h1>
        <a href={`/?lang=${lang === "en" ? "es" : "en"}`}>{t.other}</a>
      </div>
      <p className="dim">{t.tagline}</p>

      <h2>{t.servers}</h2>
      {SERVERS.map((s) => (
        <a className="card" key={s.slug} href={`/${s.slug}?lang=${lang}`}>
          <h3>{s.name[lang]}</h3>
          <p className="dim">{s.tagline[lang]}</p>
          <p><code>/{s.slug}/mcp</code></p>
        </a>
      ))}

      <footer>{t.noAuth}</footer>
    </main>
  );
}
