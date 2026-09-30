// incident drill: pretend a compromised nurse account is trawling for psych records
// fires a burst of requests for fields a nurse is NOT allowed to see.
// every one is denied (403) and counted in medvault_access_denied_total,
// which trips the SuspiciousAccessDenials alert -> alertmanager -> discord
//   node scripts/simulate-incident.mjs --base-url http://localhost:3000 --attempts 40
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(a => a.trim().split(/\s+/)));
const BASE = args['base-url'] || process.env.TARGET_URL || 'http://localhost:3000';
const ATTEMPTS = Number(args.attempts || 40);

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'nurse', context: 'totally normal shift' }),
});
const headers = { Cookie: login.headers.get('set-cookie').split(';')[0] };
const patients = await (await fetch(`${BASE}/api/patients`, { headers })).json();

let denied = 0;
for (let i = 0; i < ATTEMPTS; i++) {
  const p = patients[i % patients.length];
  const field = i % 2 === 0 ? 'psych' : 'labs';
  const res = await fetch(`${BASE}/api/patients/${p.id}/field/${field}`, { headers });
  if (res.status === 403) denied++;
}
console.log(`[incident] ${denied}/${ATTEMPTS} restricted-field attempts were DENIED on ${BASE}`);
console.log('[incident] SuspiciousAccessDenials should fire within ~1 minute. watch discord + http://localhost:9093');
