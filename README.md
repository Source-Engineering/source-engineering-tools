# Tools

> Reusable software utilities for the Source Engineering discipline.

This repository holds the discipline's reusable tools. The tools are the discipline's user-facing surface.

## Quick start

```bash
npm install
npm run build
node dist/cli/se-trace.js inspect path/to/cots.json
```

## Commands

```bash
# Inspect a COTS
se-trace inspect examples/legal-summarization.cots.json

# Cite a specific decision (print the evidence chain)
se-trace cite examples/legal-summarization.cots.json urn:source-engineering:decision:...

# Visualize a COTS as a Reasoning Roadmap (Mermaid + HTML)
se-trace visualize examples/legal-summarization.cots.json -o ./out

# Quick conformance check
se-trace validate examples/legal-summarization.cots.json

# Surface the Layer 2 (Runtime Validation) record of a COTS (RFC-0001)
se-trace validate-runtime examples/legal-summarization.cots.json

# Walk the evidence chains and surface recursive (model-generated) items (RFC-0002)
se-trace recursive examples/legal-summarization.cots.json
```

## What is in this repository

- `src/inspect.ts` - the inspect command. Prints a human-readable summary of a COTS.
- `src/cite.ts` - the cite command. Prints the evidence chain for a specific decision.
- `src/visualize.ts` - the visualize command. Renders a COTS as a Mermaid diagram + HTML page.
- `src/cli/se-trace.ts` - the CLI entry point, including `validate-runtime` (RFC-0001) and `recursive` (RFC-0002 chain-walking).
- `tests/tools.test.ts` - the test suite.

## SDKs

The `sdks/` directory is reserved for typed-language SDKs (TypeScript, Python). Skeletons land in P3 follow-on; the conformance suite and reference implementation are the canonical sources.

## Relationship to other repos

- `Source-Engineering/source-engineering-conformance` - the canonical conformance test suite. `se-trace validate` is a quick subset; the full suite is in `source-engineering-conformance`.
- `Source-Engineering/source-engineering-reference-implementation` - the reference framework that produces COTSs.
- `Source-Engineering/source-engineering-specifications` - the COTS schema the tools read.

## Status

This is the tools slice (Phase 3). The `se-trace` CLI and the visualizer are working. SDK skeletons land in P3 follow-on.

## License

Apache-2.0. See [LICENSE](LICENSE).
