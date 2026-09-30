import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, loginAs } from './helpers.js';
import { seedDb, db } from '../../server/db.js';

beforeEach(() => seedDb(5));

describe('POST /api/auth/login', () => {
  it('creates a session for a valid role and audits the login', async () => {
    const res = await request(app).post('/api/auth/login').send({ role: 'nurse', context: 'BP check' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: 'nurse', context: 'BP check' });
    expect(res.headers['set-cookie']).toBeDefined();
    expect(db.auditLog[0]).toMatchObject({ action: 'LOGIN', role: 'nurse', status: 'GRANTED' });
  });

  it.each([['janitor'], [''], [undefined], ['__proto__'], ['toString']])(
    'rejects invalid role %j with 400',
    async role => {
      const res = await request(app).post('/api/auth/login').send({ role });
      expect(res.status).toBe(400);
    },
  );

  it('defaults and truncates the treatment context', async () => {
    const empty = await request(app).post('/api/auth/login').send({ role: 'admin' });
    expect(empty.body.user.context).toBe('General access');

    const long = await request(app).post('/api/auth/login').send({ role: 'admin', context: 'x'.repeat(500) });
    expect(long.body.user.context).toHaveLength(120);
  });
});

describe('session lifecycle', () => {
  it('GET /api/auth/me returns 401 without a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns the session user after login', async () => {
    const agent = await loginAs('surgeon');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('surgeon');
  });

  it('logout destroys the session and is audited', async () => {
    const agent = await loginAs('er_doctor');
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(db.auditLog[0]).toMatchObject({ action: 'LOGOUT', role: 'er_doctor' });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('logout without a session still succeeds', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });

  it('GET /api/auth/roles lists all five clinical roles', async () => {
    const res = await request(app).get('/api/auth/roles');
    expect(Object.keys(res.body)).toEqual(['er_doctor', 'nurse', 'admin', 'psychiatrist', 'surgeon']);
  });
});
