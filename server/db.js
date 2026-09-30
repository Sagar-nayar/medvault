import { generatePatients } from './seed.js';

// in-memory "database". moved out of index.js so tests can import it
// without the server starting up every time
export const db = {
  patients: [],
  auditLog: [],
};

export const AUDIT_LOG_LIMIT = 300;

export function seedDb(count = 20) {
  db.patients = generatePatients(count);
  db.auditLog = [];
  return db;
}
