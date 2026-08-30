// A server's page: how to connect it, what tools it brings and where its data
// comes from.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { copy, pickLang } from "@/lib/i18n";
import { commands, findServer } from "@/lib/servers";
import { Styles } from "../styles";

export default async function AppleDocs({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const server = findServer("appledocs");
  if (!server) notFound();

  const { lang: asked } = await searchParams;
  const lang = pickLang(asked, (await headers()).get("accept-language"));
  const t = copy[lang];

  return (
    <main className="wrap">
      <Styles />
      <div className="top">
        <h1>{server.name[lang]}</h1>
        <a href={`/appledocs?lang=${lang === "en" ? "es" : "en"}`}>{t.other}</a>
      </div>
      <p className="dim">{server.tagline[lang]}</p>

      <h2>{t.connect}</h2>
      {commands(server.slug).map((c) => (
        <div key={c.client}>
          <p className="client">{c.client}</p>
          <pre><code>{c.line}</code></pre>
        </div>
      ))}

      <h2>{t.tools}</h2>
      <table>
        <tbody>
          {server.tools.map((tool) => (
            <tr key={tool.name}>
              <td>{tool.name}</td>
              <td className="dim">{tool.what[lang]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t.source}</h2>
      <p className="dim">{t.sourceBody}</p>

      {/* Un solo enlace, al repositorio: GitHub no tiene URL que dé la estrella
          —es un POST autenticado— y /stargazers lleva a la lista de quién la
          dio, que con cero es una página vacía. El botón está en el repo. */}
      {server.repo && (
        <div className="links">
          <a href={server.repo}>★ {t.star}</a>
        </div>
      )}

      <footer>
        <a href={`/?lang=${lang}`}>← mcps.seracreativo.com</a>
        <br />
        {t.noAuth}
      </footer>
    </main>
  );
}
