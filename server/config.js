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
  };
}

export const config = loadConfig();
