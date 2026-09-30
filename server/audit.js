import { randomUUID } from 'node:crypto';
import { db, AUDIT_LOG_LIMIT } from './db.js';
import { accessDecisionsTotal, accessDeniedTotal } from './metrics.js';
import { log } from './logger.js';

// every access decision goes 3 places: the audit log (UI), prometheus counters (grafana + alerts)
// and a json log line (docker logs)
export function addAuditEvent(event) {
  const entry = {
    id:        `EVT-${Date.now()}-${randomUUID().slice(0, 8)}`,
    timestamp: new Date().toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    ...event,
  };

  db.auditLog.unshift(entry);
  if (db.auditLog.length > AUDIT_LOG_LIMIT) db.auditLog.pop();

  accessDecisionsTotal.inc({ role: event.role, action: event.action, status: event.status });
  if (event.status === 'DENIED') {
    accessDeniedTotal.inc({ role: event.role, field: event.field || 'unknown' });
    log('warn', 'access_denied', { role: event.role, resource: event.resource });
  }
  return entry;
}
