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
  const p = resolve(__dirname, "..", "..", "se-ref", "examples", "output", name);
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
