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
import type { Cots } from "./cots.js";
export declare const toContextGraphMermaid: (cots: Cots) => string;
export declare const toContextGraphHtml: (cots: Cots, cotsId?: string) => string;
