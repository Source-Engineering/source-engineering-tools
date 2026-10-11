/**
 * Cite: print the evidence chain for a specific decision in a COTS.
 */

import type { Cots } from "./cots.js";

export const cite = (cots: Cots, decisionId: string): string => {
  const decision = cots.decisions.find((d) => d.id === decisionId);
  if (!decision) {
    return `Decision ${decisionId} not found in COTS ${cots.cots_id}.`;
  }

  const chain = cots.evidence.evidence_chain.find((c) => c.decision_id === decisionId);
  if (!chain) {
    return `Decision ${decisionId} has no evidence chain.`;
  }

  const lines: string[] = [];
  lines.push(`Decision: ${decision.decision_text}`);
  lines.push("");

  for (const claim of chain.claims) {
    lines.push(`Claim: ${claim.claim_text}`);
    lines.push(`  type: ${claim.claim_type}`);
    lines.push("");

    if (claim.supporting_evidence.length > 0) {
      lines.push("  Supporting evidence:");
      for (const id of claim.supporting_evidence) {
        const item = chain.supporting_evidence.find((e) => e.id === id);
        if (item) {
          const source = cots.inputs.source_artifacts.find((a) => a.id === item.source_id);
          const sourceLabel = source
            ? `${source.id} (${source.content_reference?.uri ?? "no uri"})`
            : item.source_id;
          lines.push(`    - ${item.id} <- ${sourceLabel}`);
          lines.push(`        op:       ${item.transformation.operation}`);
          lines.push(`        input:    ${item.transformation.inputs.join(", ")}`);
          lines.push(`        output:   ${item.transformation.output.slice(0, 200)}${item.transformation.output.length > 200 ? "..." : ""}`);
          lines.push(`        conf:     ${item.uncertainty.calibrated_score}`);
          lines.push(`        basis:    ${item.uncertainty.basis}`);
        }
      }
    }

    if (claim.contradicting_evidence.length > 0) {
      lines.push("  Contradicting evidence:");
      for (const id of claim.contradicting_evidence) {
        const item = chain.contradicting_evidence.find((e) => e.id === id);
        if (item) {
          const source = cots.inputs.source_artifacts.find((a) => a.id === item.source_id);
          const sourceLabel = source
            ? `${source.id} (${source.content_reference?.uri ?? "no uri"})`
            : item.source_id;
          lines.push(`    - ${item.id} <- ${sourceLabel}`);
          lines.push(`        op:       ${item.transformation.operation}`);
          lines.push(`        conf:     ${item.uncertainty.calibrated_score}`);
          lines.push(`        basis:    ${item.uncertainty.basis}`);
        }
      }
    }
  }

  return lines.join("\n");
};
