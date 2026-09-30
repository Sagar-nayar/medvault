// all the settings come from env vars so the exact same docker image runs in
// staging AND production (build once, deploy many). per-env values live in config/*.env

export function loadConfig(env = process.env) {
  return {
    appEnv:     env.APP_ENV || 'development',
    version:    env.APP_VERSION || 'dev',
    commit:     env.GIT_COMMIT || 'local',
    port:       Number(env.PORT) || 3000,
    seedCount:  Number(env.SEED_COUNT) || 20,
    logLevel:   env.LOG_LEVEL || 'info',
    sessionTtlMinutes: Number(env.SESSION_TTL_MINUTES) || 60,
    ...loadSecurityConfig(env),
  };
}

// security settings (added after the first Security stage run flagged them)
function loadSecurityConfig(env) {
  return {
    sessionSecret: resolveSessionSecret(env),
    corsOrigins:   (env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim()),
    loginRateLimitPerMinute: Number(env.LOGIN_RATE_LIMIT_PER_MINUTE) || 30,
    secureCookies: env.SECURE_COOKIES === 'true',
  };
}

// real environments MUST get the secret from outside (jenkins credential -> env var).
// only local dev/test are allowed a throwaway default
function resolveSessionSecret(env) {
  const appEnv = env.APP_ENV || 'development';
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 16) return env.SESSION_SECRET;
  if (['staging', 'production'].includes(appEnv)) {
    throw new Error(`SESSION_SECRET (16+ chars) is required when APP_ENV=${appEnv}`);
  }
  return `dev-only-${appEnv}-secret-change-me`;
}

export const config = loadConfig();
