import { Router } from 'express';
import { addAuditEvent } from '../audit.js';
import { loginsTotal } from '../metrics.js';

export const authRouter = Router();

export const ROLES = {
  er_doctor:    { label: 'ER Doctor',      dept: 'Emergency Department',    color: '#ff3d5a' },
  nurse:        { label: 'Nurse',          dept: 'General Ward',             color: '#3d9eff' },
  admin:        { label: 'Admin',          dept: 'Hospital Administration',  color: '#ffaa00' },
  psychiatrist: { label: 'Psychiatrist',   dept: 'Mental Health Unit',       color: '#a855f7' },
  surgeon:      { label: 'Surgeon',        dept: 'Surgical Unit',            color: '#00d4aa' },
};

const MAX_CONTEXT_LENGTH = 120;

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { role, context } = req.body ?? {};

  if (!Object.hasOwn(ROLES, role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  req.session.user = {
    role,
    roleInfo:  ROLES[role],
    context:   typeof context === 'string' && context.trim()
      ? context.trim().slice(0, MAX_CONTEXT_LENGTH)
      : 'General access',
    loginAt:   new Date().toISOString(),
    sessionId: `SES-${Date.now()}`,
  };

  loginsTotal.inc({ role });
  addAuditEvent({
    role,
    roleLabel: ROLES[role].label,
    action:    'LOGIN',
    resource:  'AUTH',
    status:    'GRANTED',
    details:   `${ROLES[role].label} authenticated - session opened`,
    severity:  'INFO',
  });

  return res.json({ ok: true, user: req.session.user });
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  if (req.session.user) {
    addAuditEvent({
      role:      req.session.user.role,
      roleLabel: req.session.user.roleInfo.label,
      action:    'LOGOUT',
      resource:  'AUTH',
      status:    'INFO',
      details:   'Session closed',
      severity:  'INFO',
    });
  }
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  return res.json(req.session.user);
});

// GET /api/auth/roles
authRouter.get('/roles', (_req, res) => {
  res.json(ROLES);
});
