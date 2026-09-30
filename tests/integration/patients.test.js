import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, loginAs } from './helpers.js';
import { seedDb, db } from '../../server/db.js';
import { ROLE_PERMISSIONS } from '../../server/middleware/accessControl.js';

beforeEach(() => seedDb(5));

describe('authentication is required (zero trust: no anonymous access)', () => {
  it.each([
    '/api/patients',
    '/api/patients/PT-00001',
    '/api/patients/PT-00001/field/psych',
    '/api/patients/PT-00001/permissions',
    '/api/audit',
    '/api/audit/stats',
  ])('GET %s → 401 without a session', async url => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/patients', () => {
  it('returns summary fields only and hides admission reason from admin', async () => {
    const agent = await loginAs('admin');
    const res = await agent.get('/api/patients');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].admissionReason).toBe('[RESTRICTED]');
    expect(res.body[0]).not.toHaveProperty('psych');
    expect(res.body[0]).not.toHaveProperty('vitals');
  });

  it('shows admission reason to clinical roles', async () => {
    const agent = await loginAs('er_doctor');
    const res = await agent.get('/api/patients');
    expect(res.body[0].admissionReason).not.toBe('[RESTRICTED]');
  });
});

describe('GET /api/patients/:id', () => {
  it('filters the record server-side for the psychiatrist', async () => {
    const agent = await loginAs('psychiatrist');
    const res = await agent.get('/api/patients/PT-00001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('psych');
    expect(res.body).not.toHaveProperty('vitals');
    expect(res.body).not.toHaveProperty('medications');
    expect(res.body._role).toBe('psychiatrist');
    expect(db.auditLog[0]).toMatchObject({ action: 'VIEW', resource: 'PATIENT:PT-00001' });
  });

  it('returns 404 for an unknown patient', async () => {
    const agent = await loginAs('nurse');
    const res = await agent.get('/api/patients/PT-99999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/patients/:id/field/:field - full RBAC matrix', () => {
  const cases = Object.entries(ROLE_PERMISSIONS).flatMap(([role, perms]) => [
    ...perms.deniedFields.map(field => [role, field, 403]),
    ...perms.allowedFields.map(field => [role, field, 200]),
  ]);

  it.each(cases)('%s → %s → %i', async (role, field, expected) => {
    const agent = await loginAs(role);
    const res = await agent.get(`/api/patients/PT-00002/field/${field}`);
    expect(res.status).toBe(expected);
  });

  it('logs a HIGH severity DENIED event with a rationale', async () => {
    const agent = await loginAs('nurse');
    const res = await agent.get('/api/patients/PT-00001/field/psych');
    expect(res.body).toMatchObject({ error: 'Access denied', field: 'psych', role: 'nurse' });
    expect(res.body.reason).toMatch(/treating clinician/);
    expect(db.auditLog[0]).toMatchObject({ status: 'DENIED', severity: 'HIGH', action: 'FIELD_ACCESS_ATTEMPT' });
  });

  it('uses a generic reason when no rationale exists', async () => {
    const agent = await loginAs('nurse');
    const res = await agent.get('/api/patients/PT-00001/field/phone');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('Outside permitted scope for this role');
  });

  it('returns 404 for field access on an unknown patient', async () => {
    const agent = await loginAs('nurse');
    const res = await agent.get('/api/patients/PT-99999/field/vitals');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/patients/:id/permissions', () => {
  it('returns the allowed/denied lists and rationale for the role', async () => {
    const agent = await loginAs('surgeon');
    const res = await agent.get('/api/patients/PT-00001/permissions');
    expect(res.body.role).toBe('surgeon');
    expect(res.body.allowed).toContain('surgeries');
    expect(res.body.denied).toContain('psych');
    expect(res.body.rationale.labs).toBeTruthy();
  });
});
