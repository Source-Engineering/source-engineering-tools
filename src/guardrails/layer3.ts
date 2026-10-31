/**
 * Guardrail rule evaluation for the se-trace CLI. A thin consumer-side
 * port of the reference implementation's Layer 3 module (RFC-0003): parses
 * the guardrail DSL and evaluates rules against a COTS so reviewers can
 * re-check a stored COTS against a rule file.
 *
 * The authoritative Layer 3 implementation lives in
 * Source-Engineering/source-engineering-reference-implementation.
 */

import type { Cots, DecisionRecord, GuardrailDecision } from "../cots.js";

export type GuardrailAction = "reject" | "annotate" | "escalate";

export interface GuardrailRule {
  rule_id: string;
  when: (cots: Cots, decision: DecisionRecord) => boolean;
  then: GuardrailAction;
  rationale: string;
}

export class GuardrailRulesMalformed extends Error {
  constructor() {
    super("guardrail-rules-malformed");
  }
}

const CONDITION_RE = /^(?:(constraint\([a-z0-9_-]+\)|flag\([a-z-]+\)|source_expired\(\)|decision_type)(\s*(?:==|!=)\s*"[^"]*")?\s*)$/;

export const parseRules = (dsl: string): GuardrailRule[] => {
  if (typeof dsl !== "string" || dsl.trim().length === 0) {
    throw new GuardrailRulesMalformed();
  }
  const ruleBlocks = dsl.match(/rule\s+[^\s{]+\s*\{[^}]*\}/g);
  if (ruleBlocks === null || ruleBlocks.length === 0) {
    throw new GuardrailRulesMalformed();
  }

  const rules: GuardrailRule[] = [];
  for (const block of ruleBlocks) {
    const idMatch = block.match(/^rule\s+([^\s{]+)\s*\{/);
    const whenMatch = block.match(/when\s+([^\n]+?)\s*\n\s*then/);
    const thenMatch = block.match(/then\s+(reject|annotate|escalate)\b/);
    const rationaleMatch = block.match(/with\s+rationale\s+"([^"]*)"/);

    if (!idMatch || !whenMatch || !thenMatch || !rationaleMatch) {
      throw new GuardrailRulesMalformed();
    }
    const condition = whenMatch[1].trim();
    if (!CONDITION_RE.test(condition.replace(/\s+/g, " "))) {
      throw new GuardrailRulesMalformed();
    }
    rules.push({
      rule_id: idMatch[1],
      when: compileCondition(condition),
      then: thenMatch[1] as GuardrailAction,
      rationale: rationaleMatch[1],
    });
  }
  return rules;
};

const compileCondition = (condition: string): ((cots: Cots, decision: DecisionRecord) => boolean) => {
  const normalized = condition.replace(/\s+/g, " ").trim();

  const constraintEq = normalized.match(/^constraint\(([a-z0-9_-]+)\)\s*==\s*"([^"]*)"$/);
  if (constraintEq) {
    const scope = constraintEq[1];
    const value = constraintEq[2];
    return (cots) => cots.context.constraints.some((c) => c.scope === scope && c.value === value);
  }

  const constraintNeq = normalized.match(/^constraint\(([a-z0-9_-]+)\)\s*!=\s*"([^"]*)"$/);
  if (constraintNeq) {
    const scope = constraintNeq[1];
    const value = constraintNeq[2];
    return (cots) => !cots.context.constraints.some((c) => c.scope === scope && c.value === value);
  }

  const flagMatch = normalized.match(/^flag\(([a-z-]+)\)$/);
  if (flagMatch) {
    const flagType = flagMatch[1];
    return (cots) =>
      cots.decisions.some((d) => d.validation?.flags.some((f) => f.flag_type === flagType) ?? false);
  }

  if (/^source_expired\(\)$/.test(normalized)) {
    return (cots) => {
      const now = Date.parse(cots.produced_at);
      return cots.inputs.source_artifacts.some(
        (a) => a.temporal_validity.valid_until !== null && Date.parse(a.temporal_validity.valid_until) < now
      );
    };
  }

  const dtMatch = normalized.match(/^decision_type\s*==\s*"([^"]*)"$/);
  if (dtMatch) {
    const suffix = dtMatch[1];
    return (cots) => cots.decisions.some((d) => d.id.includes(suffix) || d.basis_id.includes(suffix));
  }

  throw new GuardrailRulesMalformed();
};

const OUTCOME_FOR_ACTION: Record<GuardrailAction, GuardrailDecision["decision"]> = {
  reject: "rejected",
  annotate: "annotated",
  escalate: "escalated",
};

export interface Layer3Result {
  cots: Cots;
  rejected: { decision_id: string; rule_id: string; rationale: string }[];
  escalated: { decision_id: string; rule_id: string; rationale: string }[];
}

export class Layer3 {
  constructor(private readonly rules: GuardrailRule[]) {}

  evaluate(cots: Cots, options: { now?: string } = {}): Layer3Result {
    const now = options.now ?? new Date().toISOString();
    const rejected: Layer3Result["rejected"] = [];
    const escalated: Layer3Result["escalated"] = [];

    const decisions = cots.decisions.map((decision): DecisionRecord => {
      let fired: GuardrailRule | undefined;
      let outcome: GuardrailDecision["decision"] = "accepted";
      for (const rule of this.rules) {
        if (rule.when(cots, decision)) {
          fired = rule;
          outcome = OUTCOME_FOR_ACTION[rule.then];
          break;
        }
      }
      const guardrail: GuardrailDecision = {
        decision: outcome,
        rule_id: fired ? `urn:source-engineering:rule:${fired.rule_id}` : "urn:source-engineering:rule:none",
        rationale: fired ? fired.rationale : "No guardrail rule matched; the decision is accepted.",
        binding: fired?.then === "reject",
        evaluated_at: now,
        evaluated_by: "se-trace-check-guardrails",
      };
      let next: DecisionRecord = { ...decision, guardrail };
      if (outcome === "rejected") {
        next = { ...next, validation_status: { ...next.validation_status, status: "superseded", last_changed_at: now, last_changed_by: "se-trace-check-guardrails" } };
        rejected.push({ decision_id: decision.id, rule_id: fired!.rule_id, rationale: fired!.rationale });
      } else if (outcome === "escalated") {
        next = { ...next, validation_status: { ...next.validation_status, status: "appealed", last_changed_at: now, last_changed_by: "se-trace-check-guardrails" } };
        escalated.push({ decision_id: decision.id, rule_id: fired!.rule_id, rationale: fired!.rationale });
      }
      return next;
    });

    return { cots: { ...cots, decisions }, rejected, escalated };
  }
}
