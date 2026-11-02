/**
 * Audit trail replay: print a decision's full lifecycle from a COTS's
 * audit_history, marking append-only and linkage violations (RFC-0005,
 * TC-L4-01..04).
 */
import type { Cots } from "./cots.js";
export interface AuditIssue {
    test_id: string;
    message: string;
}
export interface AuditReport {
    lines: string[];
    issues: AuditIssue[];
}
export declare const replayAudit: (cots: Cots, decisionId?: string) => AuditReport;
