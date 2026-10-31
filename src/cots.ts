/**
 * Re-export of the COTS type definitions. The tools read COTSs but do not
 * own the schema; the schema is owned by
 * https://github.com/Source-Engineering/source-engineering-specifications
 */

export type URI = string;
export type ISO8601 = string;

export interface Cots {
  cots_version: string;
  cots_id: URI;
  produced_at: ISO8601;
  produced_by: { system_name: string; system_version: string };
  inputs: { source_artifacts: SourceArtifact[] };
  context: Context;
  decisions: DecisionRecord[];
  evidence: { chain_termination?: ChainTermination; evidence_chain: EvidenceChainEntry[] };
  validation: { feedback_surfaces: FeedbackSurface[] };
}

export interface SourceArtifact {
  id: URI;
  origin: { system_name: string; system_version: string; configuration_hash: string };
  version: { content_hash: string; issued_at: ISO8601 };
  authority: { asserted_by: string; trust_score: number };
  temporal_validity: { valid_from: ISO8601; valid_until: ISO8601 | null };
  content_reference?: { uri: string; media_type: string };
}

export interface Context {
  model: { model_name: string; model_version: string };
  parameters: {
    temperature: number;
    top_p: number;
    prompt_cache_id: string | null;
    tool_budget: number;
    retrieval_depth: number;
  };
  constraints: Constraint[];
}

export interface Constraint {
  id: URI;
  type: string;
  scope: string;
  value: string;
}

export type FlagType =
  | "drift-detected"
  | "segment-signal-divergence"
  | "parameter-set-out-of-range"
  | "temporal-validity-expired";

export type DecisionOnValidation = "passed" | "flagged" | "escalated";

export interface ValidationFlag {
  flag_type: FlagType;
  message: string;
  detected_at: ISO8601;
}

export interface Layer2Validation {
  flags: ValidationFlag[];
  decision_on_validation: DecisionOnValidation;
  validated_at: ISO8601;
  validated_by: string;
}

export interface DecisionRecord {
  id: URI;
  decision_text: string;
  basis_id: URI;
  evidence_chain_ref: URI;
  validation_status: { status: string; last_changed_at: ISO8601; last_changed_by: string };
  responsible_authority: { authority_id: string; authority_type: string };
  audit_history: AuditEntry[];
  created_at: ISO8601;
  /** Layer 2 Validation record (COTS schema v1.1.0, RFC-0001). Optional. */
  validation?: Layer2Validation;
}

export interface AuditEntry {
  id: URI;
  action: string;
  performed_by: string;
  performed_at: ISO8601;
  notes: string;
}

export interface EvidenceChainEntry {
  decision_id: URI;
  supporting_evidence: EvidenceItem[];
  contradicting_evidence: EvidenceItem[];
  claims: Claim[];
}

export interface Claim {
  id: URI;
  decision_record_id: URI;
  claim_text: string;
  claim_type: string;
  supporting_evidence: URI[];
  contradicting_evidence: URI[];
}

export type SourceType = "human-authored" | "human-curated" | "model-generated" | "mixed";

export type ChainTerminationPolicy = "terminal" | "bounded_recursion" | "unbounded_recursion";

export interface ChainTermination {
  policy: ChainTerminationPolicy;
  max_levels?: number;
}

export interface EvidenceItem {
  id: URI;
  claim_id: URI;
  source_id: URI;
  transformation: { operation: string; inputs: string[]; output: string; recorded_at: ISO8601 };
  uncertainty: { calibrated_score: number; basis: string };
  polarity: string;
  /** RFC-0002 (COTS schema v1.2.0). Optional. */
  source_type?: SourceType;
}

export interface FeedbackSurface {
  id: URI;
  type: string;
  target: URI;
  endpoint: string;
  description: string;
}
