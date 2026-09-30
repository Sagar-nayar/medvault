import { Router } from 'express';
import { db } from '../db.js';
import { registry } from '../metrics.js';

// ops endpoints. docker HEALTHCHECK, the deploy script (checks version + decides rollback)
// and prometheus all hit these
export function healthRouter(config) {
  const router = Router();
  const startedAt = Date.now();

  // is it alive + what build is it. deploy.sh compares version with what it just deployed
  router.get('/health', (_req, res) => {
    res.json({
      status:  'ok',
      service: 'medvault',
      version: config.version,
      env:     config.appEnv,
      commit:  config.commit,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
  });

  // ready = patient data is loaded
  router.get('/ready', (_req, res) => {
    const ready = db.patients.length > 0;
    res.status(ready ? 200 : 503).json({ ready, patients: db.patients.length });
  });

  router.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  return router;
}
