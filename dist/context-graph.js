/**
 * Context Graph: render a COTS's Context + Evidence parts as a graph.
 *
 * Nodes: context parameters, constraints, source artifacts, evidence,
 * claims, decisions. Edges carry a typed relationship from the RFC-0004
 * vocabulary floor: supports, contradicts, contextualises, constrains, set-by.
 *
 * Emitted as Mermaid plus a self-contained HTML page, same pattern as
 * visualize.ts (Reasoning Roadmap).
 */
export const toContextGraphMermaid = (cots) => {
    const lines = ["graph LR"];
    lines.push("  classDef param fill:#ede9fe,stroke:#5b21b6,color:#5b21b6");
    lines.push("  classDef constraint fill:#ffedd5,stroke:#9a3412,color:#9a3412");
    lines.push("  classDef source fill:#fef3c7,stroke:#92400e,color:#92400e");
    lines.push("  classDef claim fill:#dbeafe,stroke:#1e40af,color:#1e40af");
    lines.push("  classDef decision fill:#dcfce7,stroke:#166534,color:#166534");
    lines.push("  classDef modelGenerated fill:#fee2e2,stroke:#991b1b,color:#991b1b");
    lines.push("");
    const contextId = "context";
    lines.push(`  ${contextId}["context\\n${cots.context.model.model_name} v${cots.context.model.model_version}"]:::param`);
    const params = cots.context.parameters;
    for (const [key, value] of Object.entries(params)) {
        const nodeId = `param_${key}`;
        const label = `${key} = ${value === null ? "null" : String(value)}`;
        lines.push(`  ${nodeId}["${label}"]:::param`);
        lines.push(`  ${contextId} -. set-by .-> ${nodeId}`);
    }
    for (const c of cots.context.constraints) {
        lines.push(`  ${safeId(c.id)}["CONSTRAINT ${c.type}: ${truncate(c.value, 40)}"]:::constraint`);
        lines.push(`  ${safeId(c.id)} -. constrains .-> ${contextId}`);
    }
    for (const a of cots.inputs.source_artifacts) {
        const label = `${a.origin.system_name} v${a.origin.system_version}\\n${a.version.content_hash.slice(0, 8)}...`;
        lines.push(`  ${safeId(a.id)}["${label}"]:::source`);
    }
    for (const d of cots.decisions) {
        const dLabel = `${d.validation_status.status.toUpperCase()}\\n${truncate(d.decision_text, 60)}`;
        lines.push(`  ${safeId(d.id)}["${dLabel}"]:::decision`);
        for (const [key] of Object.entries(params)) {
            lines.push(`  param_${key} -. contextualises .-> ${safeId(d.id)}`);
        }
        const chain = cots.evidence.evidence_chain.find((c) => c.decision_id === d.id);
        if (!chain)
            continue;
        for (const claim of chain.claims) {
            const cLabel = `${claim.claim_type.toUpperCase()}\\n${truncate(claim.claim_text, 50)}`;
            lines.push(`  ${safeId(claim.id)}["${cLabel}"]:::claim`);
            lines.push(`  ${safeId(claim.id)} --> ${safeId(d.id)}`);
            for (const eid of claim.supporting_evidence) {
                const item = chain.supporting_evidence.find((e) => e.id === eid);
                if (item) {
                    lines.push(`  ${safeId(item.source_id)} -. supports .-> ${safeId(claim.id)}`);
                    if (item.source_type === "model-generated") {
                        lines.push(`  ${safeId(item.id)}["MODEL-GENERATED"]:::modelGenerated`);
                        lines.push(`  ${safeId(item.id)} -. supports .-> ${safeId(claim.id)}`);
                    }
                }
            }
            for (const eid of claim.contradicting_evidence) {
                const item = chain.contradicting_evidence.find((e) => e.id === eid);
                if (item) {
                    lines.push(`  ${safeId(item.source_id)} -. contradicts .-> ${safeId(claim.id)}`);
                    if (item.source_type === "model-generated") {
                        lines.push(`  ${safeId(item.id)}["MODEL-GENERATED"]:::modelGenerated`);
                        lines.push(`  ${safeId(item.id)} -. contradicts .-> ${safeId(claim.id)}`);
                    }
                }
            }
        }
    }
    return lines.join("\n");
};
export const toContextGraphHtml = (cots, cotsId) => {
    const mermaid = toContextGraphMermaid(cots);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Context Graph -- ${cotsId ?? cots.cots_id}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 2rem; color: #1f2937; }
    h1 { font-size: 1.5rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .mermaid { background: #ffffff; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
    .legend { display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.875rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; }
    .swatch { display: inline-block; width: 1rem; height: 1rem; border-radius: 0.25rem; }
  </style>
</head>
<body>
  <h1>Context Graph</h1>
  <div class="meta">
    <div>COTS: ${cots.cots_id}</div>
    <div>Produced: ${cots.produced_at}</div>
    <div>By: ${cots.produced_by.system_name} v${cots.produced_by.system_version}</div>
  </div>
  <div class="mermaid">
${mermaid}
  </div>
  <div class="legend">
    <div class="legend-item"><span class="swatch" style="background:#ede9fe"></span>Parameter</div>
    <div class="legend-item"><span class="swatch" style="background:#ffedd5"></span>Constraint</div>
    <div class="legend-item"><span class="swatch" style="background:#fef3c7"></span>Source</div>
    <div class="legend-item"><span class="swatch" style="background:#dbeafe"></span>Claim</div>
    <div class="legend-item"><span class="swatch" style="background:#dcfce7"></span>Decision</div>
    <div class="legend-item"><span class="swatch" style="background:#fee2e2"></span>Model-generated evidence</div>
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</body>
</html>
`;
};
const safeId = (uri) => {
    return uri.replace(/[^a-zA-Z0-9_]/g, "_");
};
const truncate = (s, n) => s.length > n ? s.slice(0, n) + "..." : s;
