/**
 * The se-trace CLI. Three subcommands:
 *   - validate <file>            Run the conformance suite against a COTS.
 *   - validate-runtime <file>    Surface the Layer 2 ValidationFlags of a COTS.
 *   - inspect <file>             Print a human-readable summary of a COTS.
 *   - cite <file> <decision-id>  Print the evidence chain for a specific decision.
 *   - visualize <file>           Render a COTS as a Reasoning Roadmap (Mermaid + HTML).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { Command } from "commander";
import { inspect } from "../inspect.js";
import { cite } from "../cite.js";
import { toMermaid, toHtml } from "../visualize.js";
import type { Cots } from "../cots.js";

// Lightweight conformance check (subset of the canonical test suite). For
// the full suite, see https://github.com/Source-Engineering/source-engineering-conformance
const quickValidate = (cots: Cots): { ok: boolean; issues: string[] } => {
  const issues: string[] = [];
  if (cots.decisions.length === 0) issues.push("No decisions");
  for (let i = 0; i < cots.inputs.source_artifacts.length; i++) {
    const a = cots.inputs.source_artifacts[i];
    if (!/^[a-z][a-z0-9+\-.]*:/i.test(a.id)) {
      issues.push(`source_artifacts[${i}].id is not a valid URI: ${a.id}`);
    }
  }
  for (let i = 0; i < cots.evidence.evidence_chain.length; i++) {
    const c = cots.evidence.evidence_chain[i];
    if (c.contradicting_evidence.length === 0) {
      issues.push(`evidence_chain[${i}] has no counter-evidence`);
    }
    for (const claim of c.claims) {
      if (claim.supporting_evidence.length === 0 && claim.contradicting_evidence.length === 0) {
        issues.push(`claim ${claim.id} has no evidence`);
      }
    }
  }
  return { ok: issues.length === 0, issues };
};

const loadCots = (path: string): Cots => {
  const resolved = path === "-" ? 0 : resolve(path);
  const contents = path === "-" ? readFileSync(0, "utf-8") : readFileSync(resolved, "utf-8");
  return JSON.parse(contents);
};

const program = new Command();

program
  .name("se-trace")
  .description("Source Engineering tools CLI")
  .version("0.1.0");

program
  .command("validate")
  .description("Run a quick conformance check against a COTS (use source-engineering-conformance for the full suite)")
  .argument("<path>", "Path to a COTS JSON file")
  .action((path: string) => {
    const cots = loadCots(path);
    const result = quickValidate(cots);
    if (result.ok) {
      console.log("PASS");
    } else {
      console.log("FAIL");
      for (const issue of result.issues) console.log(`  - ${issue}`);
      process.exit(1);
    }
  });

program
  .command("validate-runtime")
  .description("Surface the Layer 2 (Runtime Validation) record of a COTS (RFC-0001, COTS schema v1.1.0)")
  .argument("<path>", "Path to a COTS JSON file")
  .action((path: string) => {
    const cots = loadCots(path);
    let withRecord = 0;
    let flagged = 0;
    for (const decision of cots.decisions) {
      const v = decision.validation;
      if (v === undefined) {
        console.log(`${decision.id}\n  No Layer 2 Validation record (the producer has not floored Layer 2).`);
        continue;
      }
      withRecord++;
      console.log(`${decision.id}`);
      console.log(`  decision_on_validation: ${v.decision_on_validation}`);
      console.log(`  validated_at: ${v.validated_at}  by: ${v.validated_by}`);
      if (v.flags.length === 0) {
        console.log("  flags: none");
      } else {
        if (v.decision_on_validation !== "passed") flagged++;
        for (const flag of v.flags) {
          console.log(`  [${flag.flag_type}] ${flag.message} (detected ${flag.detected_at})`);
        }
      }
    }
    console.log(`\nDecisions with a Validation record: ${withRecord}/${cots.decisions.length}`);
    if (flagged > 0) {
      console.log(`Flagged decisions: ${flagged} (flags are warnings, not rejections; Layer 3 decides)`);
      process.exit(2);
    }
  });

program
  .command("inspect")
  .description("Print a human-readable summary of a COTS")
  .argument("<path>", "Path to a COTS JSON file")
  .action((path: string) => {
    const cots = loadCots(path);
    console.log(inspect(cots));
  });

program
  .command("cite")
  .description("Print the evidence chain for a specific decision in a COTS")
  .argument("<path>", "Path to a COTS JSON file")
  .argument("<decision-id>", "The decision id (urn:source-engineering:decision:...)")
  .action((path: string, decisionId: string) => {
    const cots = loadCots(path);
    console.log(cite(cots, decisionId));
  });

program
  .command("visualize")
  .description("Render a COTS as a Reasoning Roadmap (Mermaid + HTML)")
  .argument("<path>", "Path to a COTS JSON file")
  .option("-o, --out <dir>", "Output directory", ".")
  .action((path: string, opts: { out: string }) => {
    const cots = loadCots(path);
    const baseName = basename(path, extname(path));
    const mermaid = toMermaid(cots);
    const html = toHtml(cots);
    const mermaidPath = resolve(opts.out, `${baseName}.mermaid`);
    const htmlPath = resolve(opts.out, `${baseName}.reasoning-roadmap.html`);
    mkdirSync(dirname(mermaidPath), { recursive: true });
    mkdirSync(dirname(htmlPath), { recursive: true });
    writeFileSync(mermaidPath, mermaid);
    writeFileSync(htmlPath, html);
    console.log(`Mermaid:  ${mermaidPath}`);
    console.log(`HTML:     ${htmlPath}`);
  });

program.parse();
