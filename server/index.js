import { createApp } from './app.js';
import { config }    from './config.js';
import { seedDb }    from './db.js';
import { log }       from './logger.js';

seedDb(config.seedCount);
const app = createApp(config);

const server = app.listen(config.port, () => {
  log('info', 'medvault_started', {
    port: config.port,
    env: config.appEnv,
    version: config.version,
    commit: config.commit,
  });
});

// shut down nicely on docker stop so a redeploy doesnt cut off requests halfway
function shutdown(signal) {
  log('info', 'medvault_stopping', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
