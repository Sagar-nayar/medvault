import express from 'express';
import session from 'express-session';
import cors    from 'cors';
import helmet  from 'helmet';
import rateLimit from 'express-rate-limit';
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

  // security headers: CSP, no sniffing, no framing (clickjacking), hides X-Powered-By
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null, // demo runs on plain http://localhost
      },
    },
  }));

  // only our own front end is allowed to call the API with cookies
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    credentials: true,
  }));

  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(session({
    name:              'medvault.sid',
    secret:            config.sessionSecret,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      maxAge:   1000 * 60 * config.sessionTtlMinutes,
      httpOnly: true,     // js cant read the cookie
      sameSite: 'strict', // cookie not sent on cross-site requests (CSRF)
      secure:   config.secureCookies, // turn on once its behind HTTPS
    },
  }));

  // slow down anyone hammering the login endpoint
  app.use('/api/auth/login', rateLimit({
    windowMs: 60 * 1000,
    limit: config.loginRateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts, try again in a minute' },
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
