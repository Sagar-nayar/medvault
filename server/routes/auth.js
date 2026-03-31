import { Router } from 'express';
import { db } from '../index.js';

export const authRouter = Router();

const ROLES = {
  er_doctor:    { label: 'ER Doctor',      dept: 'Emergency Department',    color: '#ff3d5a' },
  nurse:        { label: 'Nurse',          dept: 'General Ward',             color: '#3d9eff' },
  admin:        { label: 'Admin',          dept: 'Hospital Administration',  color: '#ffaa00' },
  psychiatrist: { label: 'Psychiatrist',   dept: 'Mental Health Unit',       color: '#a855f7' },
  surgeon:      { label: 'Surgeon',        dept: 'Surgical Unit',            color: '#00d4aa' },
};

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { role, context } = req.body;

  if (!ROLES[role]) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  req.session.user = {
    role,
    roleInfo:  ROLES[role],
    context:   context || 'General access',
    loginAt:   new Date().toISOString(),
    sessionId: `SES-${Date.now()}`,
  };

  addAuditEvent(db, {
    role,
    roleLabel: ROLES[role].label,
    action:    'LOGIN',
    resource:  'AUTH',
    status:    'GRANTED',
    details:   `${ROLES[role].label} authenticated — session opened`,
    severity:  'INFO',
  });

  res.json({ ok: true, user: req.session.user });
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  if (req.session.user) {
    addAuditEvent(db, {
      role:      req.session.user.role,
      roleLabel: req.session.user.roleInfo.label,
      action:    'LOGOUT',
      resource:  'AUTH',
      status:    'INFO',
      details:   'Session closed',
      severity:  'INFO',
    });
  }
  req.session.destroy(() => {});
  res.json({ ok: true });
});

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.session.user);
});

// GET /api/auth/roles
authRouter.get('/roles', (_req, res) => {
  res.json(ROLES);
});

// ── Shared audit helper (also used by other routes via import) ────────────────
export function addAuditEvent(db, event) {
  db.auditLog.unshift({
    id:        `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    ...event,
  });
  if (db.auditLog.length > 300) db.auditLog.pop();
}
