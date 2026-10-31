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
