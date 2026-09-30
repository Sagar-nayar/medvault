import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/accessControl.js';
import { ROLES } from './auth.js';

export const auditRouter = Router();
auditRouter.use(requireAuth);

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 60;

// GET /api/audit?limit=50&offset=0&role=nurse&status=DENIED
auditRouter.get('/', (req, res) => {
  const limit  = Math.min(Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  const { role, status } = req.query;

  let entries = db.auditLog;
  if (role)   entries = entries.filter(e => e.role === role);
  if (status) entries = entries.filter(e => e.status === status);

  res.json({
    total:   entries.length,
    entries: entries.slice(offset, offset + limit),
  });
});

// GET /api/audit/stats
auditRouter.get('/stats', (_req, res) => {
  const entries = db.auditLog;
  const byRole = {};
  Object.keys(ROLES).forEach(r => {
    byRole[r] = entries.filter(e => e.role === r).length;
  });

  res.json({
    total:        entries.length,
    granted:      entries.filter(e => e.status === 'GRANTED').length,
    denied:       entries.filter(e => e.status === 'DENIED').length,
    highSeverity: entries.filter(e => e.severity === 'HIGH').length,
    byRole,
  });
});
