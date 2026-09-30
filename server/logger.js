// tiny json logger. one line per event so you can just do
// docker logs medvault-production | grep denied
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export function log(level, message, fields = {}) {
  const threshold = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;
  if ((LEVELS[level] ?? LEVELS.info) < threshold) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...fields });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}
