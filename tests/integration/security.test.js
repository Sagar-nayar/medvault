// regression tests for the stuff the Security stage caught.
// if someone undoes a fix, these fail in the Test stage before security even runs
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, loginAs } from './helpers.js';
import { createApp } from '../../server/app.js';
import { loadConfig } from '../../server/config.js';
import { seedDb, db } from '../../server/db.js';
import { ROLE_PERMISSIONS } from '../../server/middleware/accessControl.js';

beforeEach(() => seedDb(3));

describe('security headers (helmet)', () => {
  it('sends CSP, anti-framing and no-sniff headers and hides X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS allow-list', () => {
  it('allows the app origin with credentials', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does NOT reflect a random attacker origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('session cookie', () => {
  it('is HttpOnly and SameSite=Strict', async () => {
    const res = await request(app).post('/api/auth/login').send({ role: 'nurse' });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^medvault\.sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });
});

describe('session secret', () => {
  it('refuses to start staging/production without SESSION_SECRET', () => {
    expect(() => loadConfig({ APP_ENV: 'production' })).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ APP_ENV: 'staging', SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('uses the provided secret when it is long enough', () => {
    const cfg = loadConfig({ APP_ENV: 'production', SESSION_SECRET: 'a-very-long-production-secret' });
    expect(cfg.sessionSecret).toBe('a-very-long-production-secret');
  });
});

describe('login rate limiting', () => {
  it('returns 429 after too many attempts in a minute', async () => {
    const limited = createApp(loadConfig({ APP_ENV: 'test', LOGIN_RATE_LIMIT_PER_MINUTE: '3' }));
    const codes = [];
    for (let i = 0; i < 5; i++) {
      codes.push((await request(limited).post('/api/auth/login').send({ role: 'nurse' })).status);
    }
    expect(codes.slice(0, 3)).toEqual([200, 200, 200]);
    expect(codes[4]).toBe(429);
  });
});

describe('deny by default', () => {
  it('denies a field that is on NEITHER list (e.g. a new column added later)', async () => {
    db.patients[0].geneticProfile = 'BRCA1 positive';
    const agent = await loginAs('er_doctor');
    const res = await agent.get(`/api/patients/${db.patients[0].id}/field/geneticProfile`);
    expect(res.status).toBe(403);
    expect(ROLE_PERMISSIONS.er_doctor.deniedFields).not.toContain('geneticProfile');
  });

  it('rejects oversized JSON bodies', async () => {
    const res = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ role: 'nurse', context: 'x'.repeat(20_000) }));
    expect(res.status).toBe(413);
  });
});
