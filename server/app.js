import express from 'express';
import session from 'express-session';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';

import { config as defaultConfig } from './config.js';
import { authRouter }     from './routes/auth.js';
import { patientsRouter } from './routes/patients.js';
import { auditRouter }    from './routes/audit.js';
import { healthRouter }   from './routes/health.js';
import { metricsMiddleware, appInfo } from './metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// builds the express app but doesnt start listening.
// index.js does the listen(), tests hand the app straight to supertest
export function createApp(config = defaultConfig) {
  const app = express();

  appInfo.set({ version: config.version, env: config.appEnv, commit: config.commit }, 1);

  app.use(metricsMiddleware);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(session({
    secret:            'medvault-zero-trust-dev-secret',
    resave:            false,
    saveUninitialized: false,
    cookie:            { maxAge: 1000 * 60 * config.sessionTtlMinutes },
  }));

  app.use('/',             healthRouter(config));
  app.use('/api/auth',     authRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/audit',    auditRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  return app;
}
