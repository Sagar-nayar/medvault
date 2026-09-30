import { describe, it, expect, vi } from 'vitest';
import { ROLE_PERMISSIONS, filterPatient, requireAuth } from '../../server/middleware/accessControl.js';
import { generatePatients } from '../../server/seed.js';

const [patient] = generatePatients(1);
const roles = Object.keys(ROLE_PERMISSIONS);

describe('ROLE_PERMISSIONS policy', () => {
  it.each(roles)('%s has no field that is both allowed and denied', role => {
    const { allowedFields, deniedFields } = ROLE_PERMISSIONS[role];
    const overlap = allowedFields.filter(f => deniedFields.includes(f));
    expect(overlap).toEqual([]);
  });

  it.each(roles)('%s never gets psychiatric notes unless psychiatrist', role => {
    const canSeePsych = ROLE_PERMISSIONS[role].allowedFields.includes('psych');
    expect(canSeePsych).toBe(role === 'psychiatrist');
  });

  it('admin cannot see any clinical data', () => {
    const clinical = ['vitals', 'labs', 'medications', 'allergies', 'imaging', 'surgeries', 'psych', 'diagnoses'];
    const allowed = ROLE_PERMISSIONS.admin.allowedFields;
    expect(clinical.filter(f => allowed.includes(f))).toEqual([]);
  });
});

describe('filterPatient()', () => {
  it.each(roles)('%s receives only its allowed fields', role => {
    const result = filterPatient(patient, role);
    const { allowedFields, deniedFields } = ROLE_PERMISSIONS[role];

    for (const field of deniedFields) {
      expect(result, `${role} must not receive ${field}`).not.toHaveProperty(field);
    }
    for (const field of allowedFields) {
      expect(result).toHaveProperty(field);
    }
    expect(result._role).toBe(role);
    expect(result._denied).toEqual(deniedFields);
  });

  it('returns null for an unknown role (deny by default)', () => {
    expect(filterPatient(patient, 'janitor')).toBeNull();
  });

  it('skips allowed fields that are missing on the record', () => {
    const partial = { id: 'PT-1', name: 'Test Patient' };
    const result = filterPatient(partial, 'nurse');
    expect(result).toMatchObject({ id: 'PT-1', name: 'Test Patient' });
    expect(result).not.toHaveProperty('vitals');
  });
});

describe('requireAuth middleware', () => {
  const mockRes = () => {
    const res = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
  };

  it('rejects requests without a session user with 401', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAuth({ session: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when a session user exists', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAuth({ session: { user: { role: 'nurse' } } }, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
