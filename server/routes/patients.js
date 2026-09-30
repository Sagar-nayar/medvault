import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, filterPatient, ROLE_PERMISSIONS } from '../middleware/accessControl.js';
import { addAuditEvent } from '../audit.js';

export const patientsRouter = Router();
patientsRouter.use(requireAuth);

// logs every patient data decision against whoever is logged in
function audit(req, { action, resource, status, details, severity = 'INFO', field }) {
  const { role, roleInfo } = req.session.user;
  addAuditEvent({ role, roleLabel: roleInfo.label, action, resource, status, details, severity, field });
}

function findPatient(id) {
  return db.patients.find(p => p.id === id);
}

// GET /api/patients - list (safe summary fields only, always)
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

  audit(req, {
    action: 'LIST', resource: 'PATIENT_LIST', status: 'GRANTED',
    details: `Listed ${list.length} patients`,
  });

  res.json(list);
});

// GET /api/patients/:id - full record filtered by role
patientsRouter.get('/:id', (req, res) => {
  const patient = findPatient(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const filtered = filterPatient(patient, req.session.user.role);

  audit(req, {
    action: 'VIEW', resource: `PATIENT:${patient.id}`, status: 'GRANTED',
    details: `Viewed ${patient.name} - ${filtered._denied.length} field(s) restricted`,
  });

  return res.json(filtered);
});

// GET /api/patients/:id/field/:field - attempt a specific field (demonstrates + logs denial)
patientsRouter.get('/:id/field/:field', (req, res) => {
  const perms     = ROLE_PERMISSIONS[req.session.user.role];
  const { field } = req.params;
  const patient   = findPatient(req.params.id);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const resource = `PATIENT:${patient.id}:${field.toUpperCase()}`;

  // deny by default: only fields on the allow-list get through.
  // (this used to check the deny-list, so any field nobody remembered to list was readable)
  if (!perms.allowedFields.includes(field)) {
    audit(req, {
      action: 'FIELD_ACCESS_ATTEMPT', resource, status: 'DENIED', severity: 'HIGH', field,
      details: `${perms.label} attempted to access restricted field: ${field}`,
    });

    return res.status(403).json({
      error:  'Access denied',
      field,
      reason: perms.rationale?.[field] || 'Outside permitted scope for this role',
      role:   req.session.user.role,
    });
  }

  audit(req, {
    action: 'FIELD_ACCESS', resource, status: 'GRANTED', field,
    details: 'Field access within permitted scope',
  });

  return res.json({ field, value: patient[field] });
});

// GET /api/patients/:id/permissions - what can I see for this patient?
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
