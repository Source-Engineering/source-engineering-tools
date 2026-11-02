/**
 * COTS Explorer: render a single self-contained HTML page combining the
 * Reasoning Roadmap, the Context Graph, the inspect summary, and the audit
 * trail of a COTS. Static output; no server, no external state.
 *
 * Phase 5 of the Advancement Plan: the demo-able surface on top of
 * se-trace visualize / context-graph / inspect / audit.
 */
import type { Cots } from "./cots.js";
export declare const toExplorerHtml: (cots: Cots) => string;
