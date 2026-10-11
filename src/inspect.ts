/**
 * Inspect: print a human-readable summary of a COTS.
 */

import type { Cots, DecisionRecord, EvidenceChainEntry } from "./cots.js";

export const inspect = (cots: Cots): string => {
  const lines: string[] = [];

  lines.push(`COTS ${cots.cots_id}`);
  lines.push(`  Version:        ${cots.cots_version}`);
  lines.push(`  Produced:       ${cots.produced_at}`);
  lines.push(`  By:             ${cots.produced_by.system_name} v${cots.produced_by.system_version}`);
  lines.push("");

  lines.push(`Source universe (${cots.inputs.source_artifacts.length})`);
  for (const a of cots.inputs.source_artifacts) {
    const uri = a.content_reference?.uri ?? a.id;
    lines.push(`  - ${a.id}`);
    lines.push(`      origin:  ${a.origin.system_name} v${a.origin.system_version}`);
    lines.push(`      hash:    ${a.version.content_hash.slice(0, 16)}...`);
    lines.push(`      uri:     ${uri}`);
    lines.push(`      valid:   ${a.temporal_validity.valid_from} -> ${a.temporal_validity.valid_until ?? "open"}`);
  }
  lines.push("");

  lines.push(`Context`);
  lines.push(`  model:    ${cots.context.model.model_name} v${cots.context.model.model_version}`);
  lines.push(`  params:   temp=${cots.context.parameters.temperature} top_p=${cots.context.parameters.top_p} tools=${cots.context.parameters.tool_budget} retrieval=${cots.context.parameters.retrieval_depth}`);
  if (cots.context.constraints.length > 0) {
    lines.push(`  constraints:`);
    for (const c of cots.context.constraints) {
      lines.push(`    - ${c.type} (${c.scope}): ${c.value}`);
    }
  }
  lines.push("");

  lines.push(`Decisions (${cots.decisions.length})`);
  for (const d of cots.decisions) {
    inspectDecision(d, cots, lines);
  }

  lines.push(`Feedback surfaces (${cots.validation.feedback_surfaces.length})`);
  for (const s of cots.validation.feedback_surfaces) {
    lines.push(`  - ${s.type}: ${s.endpoint}`);
    lines.push(`      ${s.description}`);
  }

  return lines.join("\n");
};

const inspectDecision = (d: DecisionRecord, cots: Cots, lines: string[]): void => {
  lines.push(`  Decision: ${d.id}`);
  lines.push(`    Text:    ${d.decision_text.slice(0, 200)}${d.decision_text.length > 200 ? "..." : ""}`);
  lines.push(`    Status:  ${d.validation_status.status} (by ${d.validation_status.last_changed_by})`);
  lines.push(`    Auth:    ${d.responsible_authority.authority_id} (${d.responsible_authority.authority_type})`);

  const chain = cots.evidence.evidence_chain.find((c) => c.decision_id === d.id);
  if (chain) {
    inspectEvidenceChain(chain, lines);
  } else {
    lines.push(`    [WARN] no evidence chain found for this decision`);
  }

  lines.push(`    Audit (${d.audit_history.length} entries):`);
  for (const a of d.audit_history) {
    lines.push(`      - ${a.performed_at} ${a.action.padEnd(10)} by ${a.performed_by}: ${a.notes}`);
  }
};

const inspectEvidenceChain = (chain: EvidenceChainEntry, lines: string[]): void => {
  lines.push(`    Evidence chain:`);
  lines.push(`      supporting:   ${chain.supporting_evidence.length}`);
  lines.push(`      contradicting: ${chain.contradicting_evidence.length}`);
  lines.push(`      claims:       ${chain.claims.length}`);

  for (const claim of chain.claims) {
    lines.push(`      Claim: ${claim.id}`);
    lines.push(`        ${claim.claim_text.slice(0, 200)}${claim.claim_text.length > 200 ? "..." : ""}`);
    lines.push(`        type:           ${claim.claim_type}`);
    lines.push(`        supporting:     ${claim.supporting_evidence.length} item(s)`);
    lines.push(`        contradicting:  ${claim.contradicting_evidence.length} item(s)`);
  }

  for (const item of chain.supporting_evidence) {
    lines.push(`      Evidence (supports): ${item.id}`);
    lines.push(`        source:   ${item.source_id}`);
    lines.push(`        op:       ${item.transformation.operation}`);
    lines.push(`        conf:     ${item.uncertainty.calibrated_score} (${item.uncertainty.basis})`);
  }

  for (const item of chain.contradicting_evidence) {
    lines.push(`      Evidence (contradicts): ${item.id}`);
    lines.push(`        source:   ${item.source_id}`);
    lines.push(`        op:       ${item.transformation.operation}`);
    lines.push(`        conf:     ${item.uncertainty.calibrated_score} (${item.uncertainty.basis})`);
  }
};
