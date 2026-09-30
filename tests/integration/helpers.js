import request from 'supertest';
import { createApp } from '../../server/app.js';
import { loadConfig } from '../../server/config.js';

export const testConfig = loadConfig({
  APP_ENV: 'test',
  APP_VERSION: '9.9.9',
  GIT_COMMIT: 'testsha',
  SESSION_SECRET: 'test-only-secret-not-used-in-any-real-environment',
});

export const app = createApp(testConfig);

// gives back a supertest agent (keeps the cookie) already logged in as `role`
export async function loginAs(role, context = 'Integration test') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ role, context });
  if (res.status !== 200) throw new Error(`login as ${role} failed: ${res.status}`);
  return agent;
}
