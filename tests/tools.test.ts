/**
 * Tests for the tools. The CLI commands are tested by reading fixture COTSs
 * and verifying the output.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inspect } from "../src/inspect.js";
import { cite } from "../src/cite.js";
import { toMermaid, toHtml } from "../src/visualize.js";
import { toContextGraphMermaid, toContextGraphHtml } from "../src/context-graph.js";
import { replayAudit } from "../src/audit.js";
import { toExplorerHtml } from "../src/explore.js";
import type { Cots } from "../src/cots.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const loadFixture = (name: string): Cots => {
  const p = resolve(__dirname, "..", "examples", name);
  return JSON.parse(readFileSync(p, "utf-8"));
};

describe("inspect", () => {
  it("produces a human-readable summary of a COTS", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const output = inspect(cots);
    expect(output).toContain("COTS");
    expect(output).toContain("Source universe");
    expect(output).toContain("Decisions");
    expect(output).toContain("Feedback surfaces");
  });
});

describe("cite", () => {
  it("produces the evidence chain for a specific decision", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const decisionId = cots.decisions[0].id;
    const output = cite(cots, decisionId);
    expect(output).toContain("Decision:");
    expect(output).toContain("Claim:");
    expect(output).toContain("Supporting evidence:");
  });

  it("returns a not-found message for a non-existent decision", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const output = cite(cots, "urn:source-engineering:decision:does-not-exist");
    expect(output).toContain("not found");
  });
});

describe("visualize", () => {
  it("produces a Mermaid diagram for a COTS", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const mermaid = toMermaid(cots);
    expect(mermaid).toContain("graph LR");
    expect(mermaid).toContain("classDef source");
  });

  it("produces a self-contained HTML page for a COTS", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const html = toHtml(cots);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("mermaid");
    expect(html).toContain("Reasoning Roadmap");
  });
});

describe("context-graph (RFC-0004)", () => {
  it("renders every context parameter as a node with a set-by edge", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const mermaid = toContextGraphMermaid(cots);
    expect(mermaid).toContain("graph LR");
    expect(mermaid).toContain("classDef param");
    expect(mermaid).toContain('param_temperature["temperature = 0.3"]:::param');
    expect(mermaid).toContain("context -. set-by .-> param_temperature");
    expect(mermaid).toContain('param_top_p["top_p = 0.95"]');
    expect(mermaid).toContain('param_tool_budget["tool_budget = 8"]');
    expect(mermaid).toContain('param_retrieval_depth["retrieval_depth = 5"]');
    expect(mermaid).toContain('param_prompt_cache_id["prompt_cache_id = null"]');
  });

  it("links parameters to decisions with contextualises edges", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const mermaid = toContextGraphMermaid(cots);
    const decisionId = cots.decisions[0].id.replace(/[^a-zA-Z0-9_]/g, "_");
    expect(mermaid).toContain(`param_temperature -. contextualises .-> ${decisionId}`);
  });

  it("renders constraints with constrains edges when present", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.context.constraints = [
      { id: "urn:source-engineering:constraint:no-medical-advice", type: "scope", scope: "domain", value: "legal-only" },
    ];
    const mermaid = toContextGraphMermaid(cots);
    expect(mermaid).toContain("classDef constraint");
    expect(mermaid).toContain("constrains .-> context");
  });

  it("keeps the evidence edges and marks model-generated items distinctly", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.evidence.evidence_chain[0].supporting_evidence[0].source_type = "model-generated";
    const mermaid = toContextGraphMermaid(cots);
    expect(mermaid).toContain("-. supports .->");
    expect(mermaid).toContain("-. contradicts .->");
    expect(mermaid).toContain("classDef modelGenerated");
    expect(mermaid).toContain(":::modelGenerated");
  });

  it("produces a self-contained HTML page titled Context Graph", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const html = toContextGraphHtml(cots);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Context Graph");
    expect(html).toContain("mermaid");
  });

  it("writes .context-graph.mermaid and .context-graph.html via the CLI", async () => {
    const { execFileSync } = await import("node:child_process");
    const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const outDir = mkdtempSync(join(tmpdir(), "se-cg-"));
    try {
      const fixture = resolve(__dirname, "..", "examples", "legal-summarization.cots.json");
      const out = execFileSync(
        "node",
        [resolve(__dirname, "..", "dist", "cli", "se-trace.js"), "context-graph", fixture, "-o", outDir],
        { encoding: "utf-8" }
      );
      expect(out).toContain("context-graph.mermaid");
      expect(out).toContain("context-graph.html");
      const mermaid = readFileSync(join(outDir, "legal-summarization.cots.context-graph.mermaid"), "utf-8");
      expect(mermaid).toContain("graph LR");
      expect(mermaid).toContain("context -. set-by .-> param_temperature");
      const html = readFileSync(join(outDir, "legal-summarization.cots.context-graph.html"), "utf-8");
      expect(html).toContain("Context Graph");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("audit (RFC-0005)", () => {
  it("replays a clean audit trail with no issues", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const did = cots.decisions[0].id;
    cots.decisions[0].audit_history.push({
      id: "urn:source-engineering:audit:test-002",
      action: "appealed",
      performed_by: "reviewer-1",
      performed_at: "2026-11-02T09:00:00Z",
      notes: `User appealed. decision_id=${did}`,
    });
    const report = replayAudit(cots);
    expect(report.issues).toHaveLength(0);
    expect(report.lines.join("\n")).toContain("APPEALED");
    expect(report.lines.join("\n")).toContain("Audit trail: OK");
  });

  it("flags a dangling lifecycle event", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.decisions[0].audit_history.push({
      id: "urn:source-engineering:audit:test-003",
      action: "appealed",
      performed_by: "reviewer-1",
      performed_at: "2026-11-02T09:00:00Z",
      notes: "User appealed. decision_id=urn:source-engineering:decision:nope",
    });
    const report = replayAudit(cots);
    expect(report.issues.some((i) => i.test_id === "TC-L4-03")).toBe(true);
  });

  it("flags an unlinked rerun", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const did = cots.decisions[0].id;
    cots.decisions[0].audit_history.push({
      id: "urn:source-engineering:audit:test-004",
      action: "rerun",
      performed_by: "reviewer-1",
      performed_at: "2026-11-02T09:00:00Z",
      notes: `Re-run. decision_id=${did}`,
    });
    const report = replayAudit(cots, did);
    expect(report.issues.some((i) => i.test_id === "TC-L4-04")).toBe(true);
  });

  it("reports a not-found decision", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const report = replayAudit(cots, "urn:source-engineering:decision:does-not-exist");
    expect(report.lines.join("\n")).toContain("not found");
  });
});

describe("explore (COTS Explorer)", () => {
  it("renders one self-contained HTML page with all four views", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    const html = toExplorerHtml(cots);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("COTS Explorer");
    expect(html).toContain('data-tab="roadmap"');
    expect(html).toContain('data-tab="context"');
    expect(html).toContain('data-tab="summary"');
    expect(html).toContain('data-tab="audit"');
    expect(html).toContain("graph LR");
    expect(html.match(/graph LR/g)?.length).toBe(2);
    expect(html).toContain("Audit trail: OK");
    expect(html).toContain("mermaid");
  });

  it("escapes HTML in the COTS summary", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.decisions[0].decision_text = "<script>alert(1)</script>";
    const html = toExplorerHtml(cots);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows a badge with issue count when the audit trail has violations", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.decisions[0].audit_history.push({
      id: "urn:source-engineering:audit:dup",
      action: "appealed",
      performed_by: "r",
      performed_at: "2026-11-02T09:00:00Z",
      notes: "decision_id=urn:source-engineering:decision:nope",
    });
    const html = toExplorerHtml(cots);
    expect(html).toContain('badge bad');
  });

  it("writes <base>.explorer.html via the CLI", async () => {
    const { execFileSync } = await import("node:child_process");
    const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const outDir = mkdtempSync(join(tmpdir(), "se-explore-"));
    try {
      const fixture = resolve(__dirname, "..", "examples", "legal-summarization.cots.json");
      const out = execFileSync(
        "node",
        [resolve(__dirname, "..", "dist", "cli", "se-trace.js"), "explore", fixture, "-o", outDir],
        { encoding: "utf-8" }
      );
      expect(out).toContain("explorer.html");
      const html = readFileSync(join(outDir, "legal-summarization.cots.explorer.html"), "utf-8");
      expect(html).toContain("COTS Explorer");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("validate-runtime", () => {
  it("reports a Layer 2 Validation record when present", async () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.decisions[0].validation = {
      flags: [
        {
          flag_type: "drift-detected",
          message: "Calibration drift detected on segment 'contract-law' (0.14 divergence, threshold 0.10).",
          detected_at: "2026-10-11T12:00:00Z",
        },
      ],
      decision_on_validation: "flagged",
      validated_at: "2026-10-11T12:00:00Z",
      validated_by: "layer2-runtime-validation",
    };
    const { execFileSync } = await import("node:child_process");
    const tmp = resolve(__dirname, "..", "examples", "tmp-validate-runtime.cots.json");
    const { writeFileSync, rmSync } = await import("node:fs");
    writeFileSync(tmp, JSON.stringify(cots));
    try {
      try {
        execFileSync("node", [resolve(__dirname, "..", "dist", "cli", "se-trace.js"), "validate-runtime", tmp], { encoding: "utf-8" });
        throw new Error("expected exit code 2 for a flagged decision");
      } catch (e) {
        const err = e as { stdout?: string; status?: number };
        expect(err.status).toBe(2);
        const out = err.stdout ?? "";
        expect(out).toContain("decision_on_validation: flagged");
        expect(out).toContain("[drift-detected]");
        expect(out).toContain("Flagged decisions: 1");
      }
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it("reports the absence of a Validation record without failing", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    expect(cots.decisions[0].validation).toBeUndefined();
  });
});

describe("recursive (RFC-0002)", () => {
  it("surfaces model-generated evidence items and the declared policy", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.evidence.chain_termination = { policy: "bounded_recursion", max_levels: 1 };
    cots.evidence.evidence_chain[0].supporting_evidence[0].source_type = "model-generated";
    const { execFileSync } = require("node:child_process");
    const { writeFileSync, rmSync } = require("node:fs");
    const tmp = resolve(__dirname, "..", "examples", "tmp-recursive.cots.json");
    writeFileSync(tmp, JSON.stringify(cots));
    try {
      const out = execFileSync("node", [resolve(__dirname, "..", "dist", "cli", "se-trace.js"), "recursive", tmp], { encoding: "utf-8" });
      expect(out).toContain("chain_termination: bounded_recursion");
      expect(out).toContain("[RECURSIVE]");
      expect(out).toContain("Recursive items: 1");
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it("reports a clean chain when all evidence is human-authored", () => {
    const cots = loadFixture("legal-summarization.cots.json");
    cots.evidence.chain_termination = { policy: "terminal" };
    cots.evidence.evidence_chain[0].supporting_evidence[0].source_type = "human-authored";
    const { execFileSync } = require("node:child_process");
    const { writeFileSync, rmSync } = require("node:fs");
    const tmp = resolve(__dirname, "..", "examples", "tmp-recursive-clean.cots.json");
    writeFileSync(tmp, JSON.stringify(cots));
    try {
      const out = execFileSync("node", [resolve(__dirname, "..", "dist", "cli", "se-trace.js"), "recursive", tmp], { encoding: "utf-8" });
      expect(out).toContain("No model-generated evidence items");
    } finally {
      rmSync(tmp, { force: true });
    }
  });
});
