import { describe, it, expect } from 'vitest';
import { generatePatients } from '../../server/seed.js';
import { seedDb, db } from '../../server/db.js';

describe('generatePatients()', () => {
  const patients = generatePatients(10);

  it('creates the requested number of patients', () => {
    expect(patients).toHaveLength(10);
  });

  it('assigns sequential, zero-padded IDs', () => {
    expect(patients[0].id).toBe('PT-00001');
    expect(patients[9].id).toBe('PT-00010');
  });

  it('generates every data category the access policy relies on', () => {
    const p = patients[0];
    for (const key of ['mrn', 'name', 'vitals', 'labs', 'psych', 'allergies', 'medications',
      'surgeries', 'imaging', 'diagnoses', 'insurance', 'nextOfKin']) {
      expect(p).toHaveProperty(key);
    }
    expect(p.mrn).toMatch(/^MRN-\d{8}$/);
    expect(['M', 'F']).toContain(p.sex);
  });

  it('keeps psychiatric medications separate from general medications', () => {
    for (const p of patients) {
      expect(p.medications.every(m => m.cat === 'general')).toBe(true);
      expect(p.psych.medications.every(m => m.cat === 'psych')).toBe(true);
    }
  });

  it('produces clinically plausible vitals', () => {
    for (const { vitals } of patients) {
      expect(vitals.spo2).toBeGreaterThanOrEqual(93);
      expect(vitals.spo2).toBeLessThanOrEqual(100);
      expect(vitals.gcs).toBeGreaterThanOrEqual(13);
    }
  });
});

describe('seedDb()', () => {
  it('replaces patients and clears the audit log', () => {
    db.auditLog.push({ id: 'old' });
    seedDb(3);
    expect(db.patients).toHaveLength(3);
    expect(db.auditLog).toHaveLength(0);
  });
});
