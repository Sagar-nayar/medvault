import { describe, it, expect, beforeEach } from 'vitest';
import { addAuditEvent } from '../../server/audit.js';
import { db, seedDb, AUDIT_LOG_LIMIT } from '../../server/db.js';
import { registry } from '../../server/metrics.js';

const baseEvent = {
  role: 'nurse', roleLabel: 'Nurse', action: 'VIEW',
  resource: 'PATIENT:PT-00001', status: 'GRANTED', details: 'test', severity: 'INFO',
};

describe('addAuditEvent()', () => {
  beforeEach(() => seedDb(1));

  it('adds newest events to the front of the log with id + timestamp', () => {
    addAuditEvent({ ...baseEvent, details: 'first' });
    const entry = addAuditEvent({ ...baseEvent, details: 'second' });
    expect(db.auditLog[0]).toBe(entry);
    expect(entry.id).toMatch(/^EVT-\d+-[a-f0-9]{8}$/);
    expect(entry.timestamp).toBeTruthy();
    expect(db.auditLog[1].details).toBe('first');
  });

  it(`caps the log at ${AUDIT_LOG_LIMIT} entries`, () => {
    for (let i = 0; i < AUDIT_LOG_LIMIT + 25; i++) addAuditEvent(baseEvent);
    expect(db.auditLog).toHaveLength(AUDIT_LOG_LIMIT);
  });

  it('increments the denied-access Prometheus counter for DENIED events', async () => {
    const read = async () => {
      const metric = await registry.getSingleMetric('medvault_access_denied_total').get();
      return metric.values
        .filter(v => v.labels.role === 'nurse' && v.labels.field === 'psych')
        .reduce((sum, v) => sum + v.value, 0);
    };
    const before = await read();
    addAuditEvent({ ...baseEvent, status: 'DENIED', severity: 'HIGH', field: 'psych' });
    expect(await read()).toBe(before + 1);
  });
});
