import { AuditLog } from '@smm/database';
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

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await AuditLog.create({
    actorId: entry.actorId ?? null,
    actorName: entry.actorName ?? '',
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType ?? '',
    targetId: entry.targetId ?? '',
    targetLabel: entry.targetLabel ?? '',
    result: entry.result ?? 'success',
    ip: entry.ip ?? '',
    metadata: entry.metadata ?? {},
  });
}