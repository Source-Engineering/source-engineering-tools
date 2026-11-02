/**
 * The se-trace CLI. Three subcommands:
 *   - validate <file>            Run the conformance suite against a COTS.
 *   - validate-runtime <file>    Surface the Layer 2 ValidationFlags of a COTS.
 *   - inspect <file>             Print a human-readable summary of a COTS.
 *   - cite <file> <decision-id>  Print the evidence chain for a specific decision.
 *   - visualize <file>           Render a COTS as a Reasoning Roadmap (Mermaid + HTML).
 *   - context-graph <file>       Render a COTS's Context + Evidence as a Context Graph (RFC-0004).
 *   - audit <file> [decision-id] Replay a decision's audit trail (RFC-0005).
 *   - explore <file>             Render the COTS Explorer: one self-contained HTML page
 *                                (Reasoning Roadmap + Context Graph + summary + audit trail).
 */
export {};
