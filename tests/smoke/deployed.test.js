// smoke tests jenkins runs against the deployed container
//   TARGET_URL        e.g. http://medvault-staging:3000
//   EXPECTED_VERSION  the version jenkins just deployed (optional)
//   EXPECTED_ENV      staging or production (optional)
import { describe, it, expect } from 'vitest';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const { EXPECTED_VERSION, EXPECTED_ENV } = process.env;

async function call(path, { cookie, method = 'GET', body } = {}) {
  const res = await fetch(`${TARGET_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function login(role) {
  const res = await call('/api/auth/login', { method: 'POST', body: { role, context: 'Smoke test' } });
  expect(res.status).toBe(200);
  return res.headers.get('set-cookie').split(';')[0];
}

describe(`smoke: ${TARGET_URL}`, () => {
  it('is healthy and running the expected build', async () => {
    const res = await call('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    if (EXPECTED_VERSION) expect(body.version).toBe(EXPECTED_VERSION);
    if (EXPECTED_ENV) expect(body.env).toBe(EXPECTED_ENV);
  });

  it('is ready (patients seeded)', async () => {
    const res = await call('/ready');
    expect(res.status).toBe(200);
  });

  it('serves the web UI', async () => {
    const res = await call('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('MEDVAULT');
  });

  it('blocks anonymous access to patient data', async () => {
    const res = await call('/api/patients');
    expect(res.status).toBe(401);
  });

  it('lets a nurse read vitals but denies psychiatric notes', async () => {
    const cookie = await login('nurse');
    const list = await call('/api/patients', { cookie });
    expect(list.status).toBe(200);
    const [first] = await list.json();

    const vitals = await call(`/api/patients/${first.id}/field/vitals`, { cookie });
    expect(vitals.status).toBe(200);

    const psych = await call(`/api/patients/${first.id}/field/psych`, { cookie });
    expect(psych.status).toBe(403);
  });

  it('exposes Prometheus metrics for monitoring', async () => {
    const res = await call('/metrics');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('medvault_app_info');
  });
});
