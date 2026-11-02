/**
 * COTS Explorer: render a single self-contained HTML page combining the
 * Reasoning Roadmap, the Context Graph, the inspect summary, and the audit
 * trail of a COTS. Static output; no server, no external state.
 *
 * Phase 5 of the Advancement Plan: the demo-able surface on top of
 * se-trace visualize / context-graph / inspect / audit.
 */

import type { Cots } from "./cots.js";
import { toMermaid } from "./visualize.js";
import { toContextGraphMermaid } from "./context-graph.js";
import { inspect } from "./inspect.js";
import { replayAudit } from "./audit.js";

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const toExplorerHtml = (cots: Cots): string => {
  const roadmap = toMermaid(cots);
  const contextGraph = toContextGraphMermaid(cots);
  const summary = escapeHtml(inspect(cots));
  const audit = replayAudit(cots);
  const auditBlock = escapeHtml(audit.lines.join("\n"));
  const auditOk = audit.issues.length === 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>COTS Explorer -- ${escapeHtml(cots.cots_id)}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; color: #1f2937; background: #f9fafb; }
    header { background: #111827; color: #f9fafb; padding: 1rem 2rem; }
    header h1 { font-size: 1.25rem; margin: 0; }
    header .meta { color: #9ca3af; font-size: 0.8rem; margin-top: 0.25rem; }
    nav { display: flex; gap: 0.5rem; padding: 0.75rem 2rem; background: #ffffff; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; }
    nav button { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 0.375rem; padding: 0.375rem 0.875rem; cursor: pointer; font-size: 0.875rem; }
    nav button.active { background: #111827; color: #f9fafb; border-color: #111827; }
    main { padding: 1.5rem 2rem; }
    section { display: none; }
    section.active { display: block; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1rem; }
    .mermaid { overflow-x: auto; }
    pre { background: #f3f4f6; border-radius: 0.375rem; padding: 1rem; overflow-x: auto; font-size: 0.8rem; line-height: 1.5; white-space: pre-wrap; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge.ok { background: #dcfce7; color: #166534; }
    .badge.bad { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <header>
    <h1>COTS Explorer</h1>
    <div class="meta">COTS ${escapeHtml(cots.cots_id)} &middot; produced ${escapeHtml(cots.produced_at)} by ${escapeHtml(cots.produced_by.system_name)} v${escapeHtml(cots.produced_by.system_version)} &middot; schema ${escapeHtml(cots.cots_version)}</div>
  </header>
  <nav>
    <button data-tab="roadmap" class="active">Reasoning Roadmap</button>
    <button data-tab="context">Context Graph</button>
    <button data-tab="summary">Summary</button>
    <button data-tab="audit">Audit Trail ${auditOk ? '<span class="badge ok">OK</span>' : '<span class="badge bad">' + audit.issues.length + ' issues</span>'}</button>
  </nav>
  <main>
    <section id="tab-roadmap" class="active">
      <div class="card"><div class="mermaid">${escapeHtml(roadmap)}</div></div>
    </section>
    <section id="tab-context">
      <div class="card"><div class="mermaid">${escapeHtml(contextGraph)}</div></div>
    </section>
    <section id="tab-summary">
      <div class="card"><pre>${summary}</pre></div>
    </section>
    <section id="tab-audit">
      <div class="card"><pre>${auditBlock}</pre></div>
    </section>
  </main>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    const buttons = document.querySelectorAll('nav button');
    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        buttons.forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        document.querySelectorAll('main section').forEach((s) => s.classList.remove('active'));
        document.getElementById('tab-' + b.dataset.tab).classList.add('active');
      });
    });
  </script>
</body>
</html>
`;
};
