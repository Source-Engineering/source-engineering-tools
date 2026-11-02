/**
 * Audit trail replay: print a decision's full lifecycle from a COTS's
 * audit_history, marking append-only and linkage violations (RFC-0005,
 * TC-L4-01..04).
 */
export const replayAudit = (cots, decisionId) => {
    const lines = [];
    const issues = [];
    const decisions = decisionId ? cots.decisions.filter((d) => d.id === decisionId) : cots.decisions;
    if (decisionId && decisions.length === 0) {
        lines.push(`Decision not found: ${decisionId}`);
        return { lines, issues };
    }
    const decisionIds = new Set(cots.decisions.map((d) => d.id));
    for (const d of decisions) {
        lines.push(`Decision: ${d.id}`);
        lines.push(`  status: ${d.validation_status.status}  text: ${truncate(d.decision_text, 60)}`);
        const history = [...d.audit_history].sort((a, b) => Date.parse(a.performed_at) - Date.parse(b.performed_at));
        if (history.length === 0) {
            issues.push({ test_id: "TC-L4-01", message: `${d.id}: empty audit_history` });
            lines.push("  (no audit entries)");
            continue;
        }
        if (history[0].action !== "created") {
            issues.push({ test_id: "TC-L4-01", message: `${d.id}: audit trail does not start with "created"` });
        }
        const seen = new Set();
        for (let j = 0; j < history.length; j++) {
            const e = history[j];
            lines.push(`  [${e.performed_at}] ${e.action.toUpperCase()} by ${e.performed_by}`);
            lines.push(`    ${truncate(e.notes, 100)}`);
            if (seen.has(e.id)) {
                issues.push({ test_id: "TC-L4-02", message: `${d.id}: duplicate audit entry id '${e.id}' (append-only violated)` });
            }
            seen.add(e.id);
            if (j > 0 && Date.parse(e.performed_at) < Date.parse(history[j - 1].performed_at)) {
                issues.push({ test_id: "TC-L4-02", message: `${d.id}: audit entry out of time order (append-only violated)` });
            }
            if (e.action !== "created") {
                const m = e.notes.match(/decision_id=(\S+)/);
                if (!m || !decisionIds.has(m[1])) {
                    issues.push({ test_id: "TC-L4-03", message: `${d.id}: ${e.action} event does not resolve to a known decision` });
                }
            }
            if (e.action === "rerun" && !/rerun_of=\S+/.test(e.notes)) {
                issues.push({ test_id: "TC-L4-04", message: `${d.id}: rerun event lacks rerun_of linkage` });
            }
            if (e.action === "superseded" && !/superseded_by=\S+/.test(e.notes)) {
                issues.push({ test_id: "TC-L4-04", message: `${d.id}: superseded event lacks superseded_by linkage` });
            }
        }
        lines.push("");
    }
    if (issues.length === 0) {
        lines.push("Audit trail: OK (append-only, lifecycle events resolve, linkages present)");
    }
    else {
        lines.push(`Audit trail issues: ${issues.length}`);
        for (const i of issues)
            lines.push(`  [${i.test_id}] ${i.message}`);
    }
    return { lines, issues };
};
const truncate = (s, n) => s.length > n ? s.slice(0, n) + "..." : s;
