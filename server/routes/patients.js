import { Router } from 'express';
import { db } from '../index.js';
import { requireAuth, filterPatient, ROLE_PERMISSIONS } from '../middleware/accessControl.js';
import { addAuditEvent } from './auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireAuth);

// GET /api/patients — list (safe summary fields only, always)
patientsRouter.get('/', (req, res) => {
  const { role } = req.session.user;
  const canSeeReason = ROLE_PERMISSIONS[role]?.allowedFields.includes('admissionReason');

  const list = db.patients.map(p => ({
    id:              p.id,
    mrn:             p.mrn,
    name:            p.name,
    age:             p.age,
    sex:             p.sex,
    ward:            p.ward,
    admittedAt:      p.admittedAt,
    admissionReason: canSeeReason ? p.admissionReason : '[RESTRICTED]',
  }));

  addAuditEvent(db, {
    role:      req.session.user.role,
    roleLabel: req.session.user.roleInfo.label,
    action:    'LIST',
    resource:  'PATIENT_LIST',
    status:    'GRANTED',
    details:   `Listed ${list.length} patients`,
    severity:  'INFO',
  });

  res.json(list);
});

// GET /api/patients/:id — full record filtered by role
patientsRouter.get('/:id', (req, res) => {
  const patient = db.patients.find(p => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const { role } = req.session.user;
  const filtered = filterPatient(patient, role);

  addAuditEvent(db, {
    role:      role,
    roleLabel: req.session.user.roleInfo.label,
    action:    'VIEW',
    resource:  `PATIENT:${patient.id}`,
    status:    'GRANTED',
    details:   `Viewed ${patient.name} — ${filtered._denied.length} field(s) restricted`,
    severity:  'INFO',
  });

  res.json(filtered);
});

// GET /api/patients/:id/field/:field — attempt a specific field (demonstrates + logs denial)
patientsRouter.get('/:id/field/:field', (req, res) => {
  const { role } = req.session.user;
  const perms     = ROLE_PERMISSIONS[role];
  const { field } = req.params;
  const patient   = db.patients.find(p => p.id === req.params.id);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  if (perms.deniedFields.includes(field)) {
    addAuditEvent(db, {
      role:      role,
      roleLabel: req.session.user.roleInfo.label,
      action:    'FIELD_ACCESS_ATTEMPT',
      resource:  `PATIENT:${patient.id}:${field.toUpperCase()}`,
      status:    'DENIED',
      details:   `${perms.label} attempted to access restricted field: ${field}`,
      severity:  'HIGH',
    });

    return res.status(403).json({
      error:  'Access denied',
      field,
      reason: perms.rationale?.[field] || 'Outside permitted scope for this role',
      role,
    });
  }

  addAuditEvent(db, {
    role:      role,
    roleLabel: req.session.user.roleInfo.label,
    action:    'FIELD_ACCESS',
    resource:  `PATIENT:${patient.id}:${field.toUpperCase()}`,
    status:    'GRANTED',
    details:   `Field access within permitted scope`,
    severity:  'INFO',
  });

  res.json({ field, value: patient[field] });
});

// GET /api/patients/:id/permissions — what can I see for this patient?
patientsRouter.get('/:id/permissions', (req, res) => {
  const { role } = req.session.user;
  const perms = ROLE_PERMISSIONS[role];
  res.json({
    role,
    allowed:   perms.allowedFields,
    denied:    perms.deniedFields,
    rationale: perms.rationale,
  });
});
