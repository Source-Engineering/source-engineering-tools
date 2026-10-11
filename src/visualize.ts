/**
 * Visualizer: render a COTS as a Mermaid diagram and a self-contained HTML page.
 *
 * The Mermaid diagram shows the COTS's flow: Sources -> Claims -> Decision.
 * The HTML page wraps the Mermaid diagram in a self-contained viewer.
 */

import type { Cots } from "./cots.js";

export const toMermaid = (cots: Cots): string => {
  const lines: string[] = ["graph LR"];
  lines.push("  classDef source fill:#fef3c7,stroke:#92400e,color:#92400e");
  lines.push("  classDef claim fill:#dbeafe,stroke:#1e40af,color:#1e40af");
  lines.push("  classDef decision fill:#dcfce7,stroke:#166534,color:#166534");
  lines.push("  classDef contradiction fill:#fee2e2,stroke:#991b1b,color:#991b1b");
  lines.push("");

  // Sources
  for (const a of cots.inputs.source_artifacts) {
    const label = `${a.origin.system_name} v${a.origin.system_version}\\n${a.version.content_hash.slice(0, 8)}...`;
    lines.push(`  ${safeId(a.id)}["${label}"]:::source`);
  }

  // Decisions and their evidence chains
  for (const d of cots.decisions) {
    const dLabel = `${d.validation_status.status.toUpperCase()}\\n${truncate(d.decision_text, 60)}`;
    lines.push(`  ${safeId(d.id)}["${dLabel}"]:::decision`);

    const chain = cots.evidence.evidence_chain.find((c) => c.decision_id === d.id);
    if (!chain) continue;

    // Claims -> Decision
    for (const claim of chain.claims) {
      const cLabel = `${claim.claim_type.toUpperCase()}\\n${truncate(claim.claim_text, 50)}`;
      lines.push(`  ${safeId(claim.id)}["${cLabel}"]:::claim`);
      lines.push(`  ${safeId(claim.id)} --> ${safeId(d.id)}`);

      // Sources -> Claims (via evidence)
      for (const eid of claim.supporting_evidence) {
        const item = chain.supporting_evidence.find((e) => e.id === eid);
        if (item) {
          lines.push(`  ${safeId(item.source_id)} -. supports .-> ${safeId(claim.id)}`);
        }
      }
      for (const eid of claim.contradicting_evidence) {
        const item = chain.contradicting_evidence.find((e) => e.id === eid);
        if (item) {
          lines.push(`  ${safeId(item.source_id)} -. contradicts .-> ${safeId(claim.id)}`);
        }
      }
    }
  }

  return lines.join("\n");
};

export const toHtml = (cots: Cots, cotsId?: string): string => {
  const mermaid = toMermaid(cots);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reasoning Roadmap -- ${cotsId ?? cots.cots_id}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 2rem; color: #1f2937; }
    h1 { font-size: 1.5rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .mermaid { background: #ffffff; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
    .legend { display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.875rem; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; }
    .swatch { display: inline-block; width: 1rem; height: 1rem; border-radius: 0.25rem; }
  </style>
</head>
<body>
  <h1>Reasoning Roadmap</h1>
  <div class="meta">
    <div>COTS: ${cots.cots_id}</div>
    <div>Produced: ${cots.produced_at}</div>
    <div>By: ${cots.produced_by.system_name} v${cots.produced_by.system_version}</div>
  </div>
  <div class="mermaid">
${mermaid}
  </div>
  <div class="legend">
    <div class="legend-item"><span class="swatch" style="background:#fef3c7"></span>Source</div>
    <div class="legend-item"><span class="swatch" style="background:#dbeafe"></span>Claim</div>
    <div class="legend-item"><span class="swatch" style="background:#dcfce7"></span>Decision</div>
    <div class="legend-item"><span class="swatch" style="background:#fee2e2"></span>Contradiction</div>
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</body>
</html>
`;
};

const safeId = (uri: string): string => {
  // Mermaid IDs must be alphanumeric (with underscores). Strip the URI prefix.
  return uri.replace(/[^a-zA-Z0-9_]/g, "_");
};

const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n) + "..." : s;
