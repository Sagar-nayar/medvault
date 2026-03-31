import express    from 'express';
import session    from 'express-session';
import cors       from 'cors';
import path       from 'path';
import { fileURLToPath } from 'url';

import { generatePatients } from './seed.js';
import { authRouter }       from './routes/auth.js';
import { patientsRouter }   from './routes/patients.js';
import { auditRouter }      from './routes/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ── In-memory database (seeded on startup) ────────────────────────────────────
export const db = {
  patients: generatePatients(20),
  auditLog: [],
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret:            'medvault-zero-trust-dev-secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 1000 * 60 * 60 }, // 1 hour
}));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/audit',    auditRouter);

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║   🔐  MEDVAULT  —  Zero Trust        ║');
  console.log('  ║   ACUCyS × DSEC Hackathon 2026       ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║   http://localhost:${PORT}               ║`);
  console.log(`  ║   ${db.patients.length} patients seeded in memory   ║`);
  console.log('  ╚══════════════════════════════════════╝\n');
});
