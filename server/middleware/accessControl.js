/**
 * Zero Trust Access Control
 *
 * ROLE_PERMISSIONS defines exactly what each role may read.
 * filterPatient() strips everything else before the response leaves the server.
 * Nothing sensitive is ever sent to a client that shouldn't see it.
 */

export const ROLE_PERMISSIONS = {
  er_doctor: {
    label: 'ER Doctor',
    allowedFields: [
      'id', 'mrn', 'name', 'dob', 'age', 'sex',
      'ward', 'admittedAt', 'admissionReason',
      'allergies', 'medications', 'vitals', 'imaging',
    ],
    deniedFields: [
      'psych', 'surgeries', 'labs', 'diagnoses',
      'insurance', 'email', 'address', 'nextOfKin', 'gp', 'phone',
    ],
    rationale: {
      allergies:        'Critical for safe treatment - anaphylaxis risk',
      medications:      'Drug interaction checks before prescribing',
      vitals:           'Current clinical status for acute care',
      imaging:          'Injury assessment',
      psych:            'Not relevant to physical trauma treatment',
      surgeries:        'Historical only - not needed for acute ER visit',
      labs:             'Not indicated for current presentation',
      insurance:        'No clinical function in ER context',
    },
  },

  nurse: {
    label: 'Nurse',
    allowedFields: [
      'id', 'mrn', 'name', 'dob', 'age', 'sex',
      'ward', 'admittedAt', 'admissionReason',
      'vitals', 'medications', 'allergies',
    ],
    deniedFields: [
      'psych', 'surgeries', 'labs', 'imaging', 'diagnoses',
      'insurance', 'email', 'address', 'nextOfKin', 'gp', 'phone',
    ],
    rationale: {
      vitals:      'Routine monitoring and recording',
      medications: 'Administration checks - names and doses only',
      allergies:   'Safety during care delivery',
      labs:        'Clinical interpretation - doctor scope only',
      imaging:     'Radiological review - doctor scope only',
      psych:       'Protected category - treating clinician only',
      surgeries:   'Historical data outside nursing scope',
    },
  },

  admin: {
    label: 'Admin',
    allowedFields: [
      'id', 'mrn', 'name', 'dob', 'sex',
      'phone', 'email', 'address',
      'ward', 'admittedAt', 'insurance', 'nextOfKin',
    ],
    deniedFields: [
      'psych', 'surgeries', 'labs', 'imaging', 'diagnoses',
      'medications', 'vitals', 'allergies', 'admissionReason', 'gp', 'age',
    ],
    rationale: {
      name:           'Required for scheduling and patient identification',
      insurance:      'Billing and administrative processing',
      nextOfKin:      'Emergency contact management',
      diagnoses:      'Clinical data - no administrative function',
      medications:    'Clinical data - no administrative function',
      psych:          'Sensitive protected category - admin has no need',
      vitals:         'Clinical monitoring - no administrative function',
    },
  },

  psychiatrist: {
    label: 'Psychiatrist',
    allowedFields: [
      'id', 'mrn', 'name', 'dob', 'age', 'sex',
      'ward', 'admittedAt', 'psych',
    ],
    deniedFields: [
      'surgeries', 'labs', 'imaging', 'diagnoses', 'medications',
      'vitals', 'allergies', 'insurance', 'email', 'address',
      'nextOfKin', 'gp', 'admissionReason', 'phone',
    ],
    rationale: {
      psych:       'Primary treatment scope - full access',
      medications: 'Physical medications outside psychiatric scope',
      labs:        'Physical health data - outside scope',
      surgeries:   'Physical history - outside scope',
      vitals:      'Physical monitoring - outside scope',
      allergies:   'Physical safety data - refer to treating GP',
    },
  },

  surgeon: {
    label: 'Surgeon',
    allowedFields: [
      'id', 'mrn', 'name', 'dob', 'age', 'sex',
      'ward', 'admittedAt', 'admissionReason',
      'allergies', 'medications', 'surgeries', 'labs', 'vitals', 'imaging',
    ],
    deniedFields: [
      'psych', 'diagnoses', 'insurance', 'email',
      'address', 'nextOfKin', 'gp', 'phone',
    ],
    rationale: {
      surgeries:  'Surgical history critical for operative planning',
      labs:       'Pre-operative bloods and coagulation status',
      allergies:  'Anaesthesia and medication safety',
      imaging:    'Operative planning and anatomy review',
      psych:      'Not relevant to surgical procedure',
      insurance:  'No surgical clinical function',
    },
  },
};

/**
 * Strip a patient record to only the fields the role is allowed to see.
 * The _denied array is included so the frontend can render locked cards.
 */
export function filterPatient(patient, role) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return null;

  const filtered = {};
  for (const field of perms.allowedFields) {
    if (patient[field] !== undefined) {
      filtered[field] = patient[field];
    }
  }

  filtered._denied = perms.deniedFields;
  filtered._role   = role;
  return filtered;
}

/** Express middleware - reject unauthenticated requests */
export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}
