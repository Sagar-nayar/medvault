import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, loginAs } from './helpers.js';
import { seedDb, db } from '../../server/db.js';

beforeEach(() => seedDb(5));

describe('audit API', () => {
  it('paginates and filters the audit log', async () => {
    const agent = await loginAs('nurse');
    await agent.get('/api/patients/PT-00001/field/psych');   // DENIED
    await agent.get('/api/patients/PT-00001/field/vitals');  // GRANTED

    const all = await agent.get('/api/audit?limit=2');
    expect(all.body.entries).toHaveLength(2);
    expect(all.body.total).toBeGreaterThanOrEqual(3);

    const denied = await agent.get('/api/audit?status=DENIED&role=nurse');
    expect(denied.body.total).toBe(1);
    expect(denied.body.entries[0].resource).toBe('PATIENT:PT-00001:PSYCH');
  });

  it('clamps bad pagination input', async () => {
    const agent = await loginAs('admin');
    const res = await agent.get('/api/audit?limit=abc&offset=-5');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeLessThanOrEqual(60);
  });

  it('summarises granted, denied and high-severity events', async () => {
    const agent = await loginAs('admin');
    await agent.get('/api/patients/PT-00001/field/labs');
    const res = await agent.get('/api/audit/stats');
    expect(res.body).toMatchObject({ denied: 1, highSeverity: 1 });
    expect(res.body.granted).toBeGreaterThanOrEqual(1);
    expect(res.body.byRole.admin).toBeGreaterThanOrEqual(2);
  });
});

describe('operational endpoints', () => {
  it('GET /health reports version and environment', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', version: '9.9.9', env: 'test', commit: 'testsha' });
  });

  it('GET /ready is 200 once seeded and 503 when empty', async () => {
    expect((await request(app).get('/ready')).status).toBe(200);
    db.patients = [];
    expect((await request(app).get('/ready')).status).toBe(503);
  });

  it('GET /metrics exposes Prometheus metrics', async () => {
    const agent = await loginAs('nurse');
    await agent.get('/api/patients/PT-00001/field/psych');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('medvault_access_denied_total');
    expect(res.text).toContain('medvault_app_info{version="9.9.9",env="test",commit="testsha"} 1');
  });

  it('unknown API routes return JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('serves the single-page app for non-API routes', async () => {
    const res = await request(app).get('/some/client/route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('MEDVAULT');
  });
});
