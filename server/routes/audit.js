import { Router } from 'express';
import { db } from '../index.js';
import { requireAuth } from '../middleware/accessControl.js';

export const auditRouter = Router();
auditRouter.use(requireAuth);

// GET /api/audit?limit=50&offset=0&role=nurse&status=DENIED
auditRouter.get('/', (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 60, 200);
  const offset = parseInt(req.query.offset) || 0;
  const { role, status } = req.query;

  let log = db.auditLog;
  if (role)   log = log.filter(e => e.role === role);
  if (status) log = log.filter(e => e.status === status);

  res.json({
    total:   log.length,
    entries: log.slice(offset, offset + limit),
  });
});

// GET /api/audit/stats
auditRouter.get('/stats', (_req, res) => {
  const log = db.auditLog;
  const byRole = {};
  ['er_doctor', 'nurse', 'admin', 'psychiatrist', 'surgeon'].forEach(r => {
    byRole[r] = log.filter(e => e.role === r).length;
  });

  res.json({
    total:        log.length,
    granted:      log.filter(e => e.status === 'GRANTED').length,
    denied:       log.filter(e => e.status === 'DENIED').length,
    highSeverity: log.filter(e => e.severity === 'HIGH').length,
    byRole,
  });
});
