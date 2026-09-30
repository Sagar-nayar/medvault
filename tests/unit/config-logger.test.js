import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadConfig } from '../../server/config.js';
import { log } from '../../server/logger.js';

describe('loadConfig()', () => {
  it('uses safe development defaults', () => {
    const cfg = loadConfig({});
    expect(cfg).toMatchObject({ appEnv: 'development', version: 'dev', port: 3000, seedCount: 20 });
  });

  it('reads environment-specific values', () => {
    const cfg = loadConfig({
      APP_ENV: 'production', APP_VERSION: '1.1.7', GIT_COMMIT: 'abc1234',
      PORT: '8080', SEED_COUNT: '50', SESSION_TTL_MINUTES: '15',
      SESSION_SECRET: 'unit-test-secret-1234567890',
    });
    expect(cfg).toMatchObject({
      appEnv: 'production', version: '1.1.7', commit: 'abc1234',
      port: 8080, seedCount: 50, sessionTtlMinutes: 15,
    });
  });
});

describe('log()', () => {
  const original = process.env.LOG_LEVEL;
  afterEach(() => {
    process.env.LOG_LEVEL = original;
    vi.restoreAllMocks();
  });

  it('writes JSON lines at or above the configured level', () => {
    process.env.LOG_LEVEL = 'info';
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    log('info', 'hello', { a: 1 });
    log('error', 'boom');
    log('debug', 'hidden');
    expect(out).toHaveBeenCalledOnce();
    expect(JSON.parse(out.mock.calls[0][0])).toMatchObject({ level: 'info', msg: 'hello', a: 1 });
    expect(err).toHaveBeenCalledOnce();
  });

  it('is silent when LOG_LEVEL=silent', () => {
    process.env.LOG_LEVEL = 'silent';
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    log('info', 'nothing');
    expect(out).not.toHaveBeenCalled();
  });
});
