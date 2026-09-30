// fake clinicians using the app so grafana actually has something to show
//   node scripts/simulate-traffic.mjs --base-url http://localhost:3000 --duration 60
// every "user" logs in as a random role, opens patients, and sometimes pokes at a field
// they shouldnt see (which gets denied + logged, like real life)
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(a => a.trim().split(/\s+/)));
const BASE = args['base-url'] || process.env.TARGET_URL || 'http://localhost:3000';
const DURATION_S = Number(args.duration || 30);
const ROLES = ['er_doctor', 'nurse', 'admin', 'psychiatrist', 'surgeon'];
const FIELDS = ['vitals', 'allergies', 'medications', 'labs', 'psych', 'imaging', 'insurance'];

const pick = list => list[Math.floor(Math.random() * list.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function session() {
  const role = pick(ROLES);
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, context: 'Simulated shift' }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  const headers = { Cookie: cookie };
  const patients = await (await fetch(`${BASE}/api/patients`, { headers })).json();
  for (let i = 0; i < 3; i++) {
    const p = pick(patients);
    await fetch(`${BASE}/api/patients/${p.id}`, { headers });
    await fetch(`${BASE}/api/patients/${p.id}/field/${pick(FIELDS)}`, { headers });
  }
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers });
}

const end = Date.now() + DURATION_S * 1000;
let sessions = 0;
while (Date.now() < end) {
  await Promise.all([session(), session(), session()]).catch(err => console.error(err.message));
  sessions += 3;
  await sleep(500);
}
console.log(`[traffic] ran ${sessions} simulated clinician sessions against ${BASE}`);
