import type { Role } from '@smm/types';
export interface AuditEntry {
    actorId?: string | null;
    actorName?: string;
    actorRole: Role | 'system';
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    result?: 'success' | 'failure';
    ip?: string;
    metadata?: Record<string, unknown>;
}
export declare function writeAuditLog(entry: AuditEntry): Promise<void>;
