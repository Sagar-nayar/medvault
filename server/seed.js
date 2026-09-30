import { faker } from '@faker-js/faker';

const ALLERGIES = [
  'Penicillin', 'Sulfonamides', 'Aspirin', 'Latex', 'Ibuprofen',
  'Codeine', 'Morphine', 'Cephalosporins', 'Tetracycline', 'Contrast dye',
];

const ALLERGY_REACTIONS = ['Anaphylaxis', 'Hives', 'Rash', 'Angioedema', 'Nausea', 'Bronchospasm'];
const ALLERGY_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS'];

const MEDICATIONS = [
  { name: 'Metformin',     dose: '500mg',   freq: 'BD',        cat: 'general' },
  { name: 'Atorvastatin',  dose: '20mg',    freq: 'nocte',     cat: 'general' },
  { name: 'Aspirin',       dose: '100mg',   freq: 'daily',     cat: 'general' },
  { name: 'Ramipril',      dose: '5mg',     freq: 'mane',      cat: 'general' },
  { name: 'Omeprazole',    dose: '20mg',    freq: 'daily',     cat: 'general' },
  { name: 'Salbutamol',    dose: '100mcg',  freq: 'PRN',       cat: 'general' },
  { name: 'Warfarin',      dose: '3mg',     freq: 'daily',     cat: 'general' },
  { name: 'Sertraline',    dose: '100mg',   freq: 'mane',      cat: 'psych'   },
  { name: 'Quetiapine',    dose: '25mg',    freq: 'nocte',     cat: 'psych'   },
  { name: 'Escitalopram',  dose: '10mg',    freq: 'mane',      cat: 'psych'   },
  { name: 'Melatonin',     dose: '3mg',     freq: 'nocte PRN', cat: 'psych'   },
  { name: 'Valproate',     dose: '200mg',   freq: 'BD',        cat: 'psych'   },
];

const PSYCH_DIAGNOSES = [
  { code: 'F41.1', name: 'Generalised Anxiety Disorder'  },
  { code: 'F32.1', name: 'Moderate Depressive Episode'   },
  { code: 'F20.0', name: 'Paranoid Schizophrenia'        },
  { code: 'F31.1', name: 'Bipolar Disorder I'            },
  { code: 'F40.1', name: 'Social Phobia'                 },
];

const GENERAL_DIAGNOSES = [
  { code: 'E11.9', name: 'Type 2 Diabetes Mellitus' },
  { code: 'I10',   name: 'Essential Hypertension'   },
  { code: 'J45.9', name: 'Asthma, unspecified'      },
  { code: 'M54.5', name: 'Low back pain'             },
  { code: 'K21.0', name: 'GORD with oesophagitis'   },
];

const SURGERIES = [
  'Appendectomy', 'Cholecystectomy', 'Knee arthroscopy',
  'Tonsillectomy', 'Hernia repair', 'Carpal tunnel release',
  'Wisdom tooth extraction', 'Laparoscopic bowel resection',
];

const IMAGING = [
  { type: 'X-Ray', region: 'Chest',          finding: 'No acute cardiopulmonary disease'              },
  { type: 'X-Ray', region: 'Left Arm',        finding: 'Distal radius fracture - undisplaced'          },
  { type: 'CT',    region: 'Abdomen/Pelvis',  finding: 'No acute intra-abdominal pathology'            },
  { type: 'MRI',   region: 'Lumbar Spine',    finding: 'L4/L5 disc bulge with mild foraminal narrowing'},
  { type: 'Echo',  region: 'Cardiac',         finding: 'Normal LV function, EF 62%'                   },
  { type: 'CT',    region: 'Head',            finding: 'No intracranial haemorrhage or mass lesion'    },
];

const ADMISSION_REASONS = [
  'Fractured radius - trauma', 'Chest pain evaluation', 'Hypertensive crisis',
  'Routine blood pressure check', 'Post-operative review', 'Diabetic ketoacidosis',
  'Asthma exacerbation', 'Fall - query hip fracture', 'Acute back pain',
  'Elective pre-op assessment', 'Cellulitis - left leg', 'UTI with systemic features',
];

const WARDS = ['4B', '2A', '3C', 'ED', 'ICU', 'Psych Unit', 'Surgical', 'HDU'];

const INSURERS = ['Medicare', 'Medibank Private', 'BUPA', 'HCF', 'NIB', 'Self-funded'];

const PSYCH_NOTES = [
  'Patient reports improved sleep patterns. Continues with CBT techniques.',
  'Discussed coping strategies for workplace stress. Mood stable on current regimen.',
  'Patient expressed anxiety around upcoming medical procedure. Psychoeducation provided.',
  'Review of medication efficacy. Reports reduction in intrusive thoughts.',
  'Session focused on grounding techniques. No acute risk identified.',
  'Patient engaged well. Exploring relationship patterns through schema therapy.',
];

// aussie mobile number like 0412 345 678
function mobile() {
  return `04${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`;
}

function pick(arr) {
  return faker.helpers.arrayElement(arr);
}

function subset(arr, min, max) {
  return faker.helpers.arrayElements(arr, faker.number.int({ min, max }));
}

function generateVitals() {
  const bp_s = faker.number.int({ min: 108, max: 168 });
  const bp_d = faker.number.int({ min: 68, max: 102 });
  const spo2 = faker.number.int({ min: 93, max: 100 });
  const temp = faker.number.float({ min: 36.1, max: 38.8, fractionDigits: 1 });
  return {
    bp:         `${bp_s} / ${bp_d}`,
    bp_systolic: bp_s,
    hr:          faker.number.int({ min: 56, max: 108 }),
    spo2,
    temp:        temp.toFixed(1),
    rr:          faker.number.int({ min: 12, max: 24 }),
    gcs:         faker.number.int({ min: 13, max: 15 }),
    glucose:     faker.number.float({ min: 4.2, max: 12.4, fractionDigits: 1 }).toFixed(1),
    recordedAt:  new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
  };
}

function generateLabs() {
  return {
    hba1c:       faker.number.float({ min: 5.4, max: 10.2, fractionDigits: 1 }).toFixed(1),
    cholesterol: faker.number.float({ min: 3.1, max: 8.2, fractionDigits: 1 }).toFixed(1),
    egfr:        faker.number.int({ min: 38, max: 118 }),
    wbc:         faker.number.float({ min: 3.8, max: 12.0, fractionDigits: 1 }).toFixed(1),
    hgb:         faker.number.float({ min: 10.2, max: 17.2, fractionDigits: 1 }).toFixed(1),
    inr:         faker.number.float({ min: 0.9, max: 3.4, fractionDigits: 1 }).toFixed(1),
    takenAt:     faker.date.recent({ days: 4 }).toLocaleDateString('en-AU'),
  };
}

function generatePsych() {
  return {
    primaryDiagnosis: pick(PSYCH_DIAGNOSES),
    sessionCount:     faker.number.int({ min: 2, max: 30 }),
    lastSession:      faker.date.recent({ days: 21 }).toLocaleDateString('en-AU'),
    riskLevel:        faker.helpers.weightedArrayElement([
      { weight: 6, value: 'LOW' },
      { weight: 3, value: 'MEDIUM' },
      { weight: 1, value: 'HIGH' },
    ]),
    notes:       pick(PSYCH_NOTES),
    medications: subset(MEDICATIONS.filter(m => m.cat === 'psych'), 1, 2),
    therapist:   `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`,
  };
}

export function generatePatients(count = 20) {
  return Array.from({ length: count }, (_, i) => {
    const sex       = faker.person.sexType();
    const firstName = faker.person.firstName(sex);
    const lastName  = faker.person.lastName();
    const dob       = faker.date.birthdate({ min: 18, max: 84, mode: 'age' });
    const age       = new Date().getFullYear() - dob.getFullYear();

    return {
      id:   `PT-${String(i + 1).padStart(5, '0')}`,
      mrn:  `MRN-${faker.number.int({ min: 10000000, max: 99999999 })}`,
      name: `${firstName} ${lastName}`,
      dob:  dob.toLocaleDateString('en-AU'),
      age,
      sex:  sex === 'male' ? 'M' : 'F',

      // Admin fields
      phone:     mobile(),
      email:     faker.internet.email({ firstName, lastName }).toLowerCase(),
      address:   `${faker.location.streetAddress()}, ${faker.location.city()} ${faker.location.state({ abbreviated: true })} ${faker.location.zipCode('####')}`,
      insurance: pick(INSURERS),
      nextOfKin: {
        name:     `${faker.person.firstName()} ${lastName}`,
        relation: pick(['Spouse', 'Parent', 'Sibling', 'Child', 'Partner']),
        phone:    mobile(),
      },

      // Clinical metadata
      ward:            pick(WARDS),
      admittedAt:      faker.date.recent({ days: 4 }).toLocaleDateString('en-AU'),
      admissionReason: pick(ADMISSION_REASONS),
      gp:              `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`,

      // Clinical data (role-gated)
      vitals:      generateVitals(),
      labs:        generateLabs(),
      psych:       generatePsych(),
      allergies:   subset(ALLERGIES, 0, 3).map(a => ({
        substance: a,
        reaction:  pick(ALLERGY_REACTIONS),
        severity:  pick(ALLERGY_SEVERITIES),
      })),
      medications: subset(MEDICATIONS.filter(m => m.cat === 'general'), 1, 4),
      surgeries:   subset(SURGERIES, 0, 3).map(s => ({
        procedure: s,
        year:      faker.number.int({ min: 2004, max: 2024 }),
        surgeon:   `Dr. ${faker.person.lastName()}`,
        outcome:   'Uncomplicated',
      })),
      imaging: subset(IMAGING, 1, 2).map(img => ({
        ...img,
        date:        faker.date.recent({ days: 60 }).toLocaleDateString('en-AU'),
        radiologist: `Dr. ${faker.person.lastName()} (Radiology)`,
      })),
      diagnoses: subset(GENERAL_DIAGNOSES, 1, 3),
    };
  });
}
