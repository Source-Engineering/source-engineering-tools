#!/usr/bin/env bash
# se-trace quickstart: zero to a validated COTS in under 15 minutes.
#
# Path (Advancement Plan Phase 5, "Adopter quickstart"):
#   1. Fetch a seed COTS from the reference implementation (no build needed).
#   2. Validate it with this repo's quick conformance check.
#   3. Inspect it, cite its decision, and render the COTS Explorer page.
#
# Usage: bash scripts/quickstart.sh [workdir]
set -euo pipefail

WORKDIR="${1:-$(mktemp -d /tmp/se-quickstart-XXXXXX)}"
SEED_URL="https://raw.githubusercontent.com/Source-Engineering/source-engineering-reference-implementation/main/examples/legal-summarization.cots.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SE_TRACE="$(cd "$SCRIPT_DIR/.." && pwd)/dist/cli/se-trace.js"

echo "== se-trace quickstart =="
echo "workdir: $WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "-- 1/4 obtaining seed COTS"
if curl -fsSL "$SEED_URL" -o seed.cots.json 2>/dev/null; then
  echo "   fetched seed.cots.json from source-engineering-reference-implementation ($(wc -c < seed.cots.json) bytes)"
else
  SEED_LOCAL="$(cd "$SCRIPT_DIR/.." && pwd)/examples/legal-summarization.cots.json"
  cp "$SEED_LOCAL" seed.cots.json
  echo "   copied bundled seed.cots.json from this repo's examples/ ($(wc -c < seed.cots.json) bytes)"
fi

echo "-- 2/4 quick conformance check"
node "$SE_TRACE" validate seed.cots.json

echo "-- 3/4 inspect + cite"
node "$SE_TRACE" inspect seed.cots.json | head -8
DECISION_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('seed.cots.json','utf-8')).decisions[0].id)")
node "$SE_TRACE" cite seed.cots.json "$DECISION_ID" | head -6

echo "-- 4/4 COTS Explorer page"
node "$SE_TRACE" explore seed.cots.json -o .

echo
echo "Done in one command path. Artefacts in $WORKDIR:"
ls -1 "$WORKDIR"
echo
echo "Next: read the manifesto (source-engineering-foundations/docs/00-manifesto.md),"
echo "then the 90-minute tutorial (source-engineering-education/tutorial-90-minutes.md)."
