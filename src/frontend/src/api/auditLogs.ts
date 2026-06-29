import client from './client';
import type { PagedResult } from '../types/device';

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export const listAuditLogs = (entityName?: string, page = 1, pageSize = 20) =>
  client.get<PagedResult<AuditLog>>('/audit-logs', { params: { entityName, page, pageSize } }).then((r) => r.data);
