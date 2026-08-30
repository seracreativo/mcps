// One place for the look: it is two pages, and no styling library justifies an
// extra build step.
export function Styles() {
  return (
    <style>{`
      :root { color-scheme: light dark; --fg:#18181b; --dim:#71717a; --line:#e4e4e7; --code:#f4f4f5; --bg:#fff; }
      @media (prefers-color-scheme: dark) {
        :root { --fg:#fafafa; --dim:#a1a1aa; --line:#27272a; --code:#18181b; --bg:#09090b; }
      }
      * { box-sizing: border-box; }
      body { margin:0; background: var(--bg); }
      .wrap { font-family: ui-sans-serif, -apple-system, system-ui, sans-serif; color: var(--fg);
              max-width: 46rem; margin: 0 auto; padding: 3.5rem 1.5rem 6rem; line-height: 1.6; }
      a { color: inherit; }
      h1 { font-size: 1.6rem; margin: 0 0 .5rem; letter-spacing: -.02em; }
      h2 { font-size: 1rem; margin: 2.75rem 0 .75rem; letter-spacing: -.01em; }
      p { margin: 0 0 1rem; }
      .dim { color: var(--dim); }
      .top { display:flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: .5rem; }
      .top a { font-size: .8rem; color: var(--dim); text-decoration: none; }
      .top a:hover { color: var(--fg); }
      .card { display:block; border:1px solid var(--line); border-radius:12px; padding: 1rem 1.15rem;
              text-decoration: none; margin-bottom: .75rem; }
      .card:hover { border-color: var(--dim); }
      .card h3 { margin: 0 0 .2rem; font-size: .98rem; }
      .card p { margin: 0; font-size: .88rem; }
      .card code { font-size: .78rem; color: var(--dim); }
      pre { background: var(--code); border:1px solid var(--line); border-radius:10px;
            padding: .85rem 1rem; overflow-x: auto; font-size: .82rem; margin: 0 0 .75rem; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .client { font-size: .78rem; font-weight: 600; margin: 0 0 .3rem; }
      table { border-collapse: collapse; width: 100%; font-size: .9rem; }
      td { border-top: 1px solid var(--line); padding: .6rem 0; vertical-align: top; }
      td:first-child { white-space: nowrap; padding-right: 1.25rem; font-family: ui-monospace, monospace; font-size: .8rem; }
      .links { display:flex; gap:.6rem; flex-wrap: wrap; margin-top: 1rem; }
      .links a { border:1px solid var(--line); border-radius:8px; padding:.4rem .7rem;
                 font-size:.82rem; text-decoration:none; }
      .links a:hover { border-color: var(--dim); }
      footer { margin-top: 3.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line);
               font-size: .82rem; color: var(--dim); }
    `}</style>
  );
}
