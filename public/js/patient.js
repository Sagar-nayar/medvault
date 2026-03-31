/**
 * Patient record renderer
 * Builds the HTML for a filtered patient object returned by the API.
 */

const ROLE_COLORS = {
  er_doctor:    '#ff3d5a',
  nurse:        '#3d9eff',
  admin:        '#ffaa00',
  psychiatrist: '#a855f7',
  surgeon:      '#00d4aa',
};

async function loadPatient(id) {
  // Highlight sidebar row
  document.querySelectorAll('.p-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));

  const view  = document.getElementById('patient-view');
  const empty = document.getElementById('empty-state');
  empty.classList.add('hidden');
  view.classList.remove('hidden');
  view.innerHTML = `<div style="padding:40px;text-align:center;
    font-family:var(--mono);font-size:11px;color:var(--tx-lo)">Loading…</div>`;

  const [patient, perms] = await Promise.all([
    API.patients.get(id),
    API.patients.permissions(id),
  ]);

  view.innerHTML = buildPatientView(patient, perms);
}

function buildPatientView(p, perms) {
  const color = ROLE_COLORS[p._role] || 'var(--green)';
  return `
    ${buildHeader(p, color)}
    ${buildScopeBanner(perms)}
    <div class="cards-grid">
      ${buildAllergies(p)}
      ${buildMedications(p)}
      ${buildVitals(p)}
      ${buildImaging(p)}
      ${buildSurgeries(p)}
      ${buildLabs(p)}
      ${buildPsych(p)}
      ${buildAdmin(p)}
    </div>
  `;
}

/* ── Header ─────────────────────────────────────────────── */
function buildHeader(p, color) {
  return `
    <div class="pt-header" style="--accent:${color}">
      <div>
        <div class="pt-name">${p.name ?? 'Unknown'}</div>
        <div class="pt-meta">
          ${p.dob        ? `<span>DOB: ${p.dob}</span>` : ''}
          ${p.age != null? `<span>Age: ${p.age}${p.sex ?? ''}</span>` : ''}
          ${p.mrn        ? `<span>${p.mrn}</span>` : ''}
          ${p.ward       ? `<span>Ward: ${p.ward}</span>` : ''}
          ${p.admittedAt ? `<span>Admitted: ${p.admittedAt}</span>` : ''}
        </div>
      </div>
      <div class="pt-ctx">
        <div class="pt-ctx-lbl">// TREATMENT CONTEXT</div>
        <div class="pt-ctx-val" style="color:${color}">${_currentUser?.context ?? 'General access'}</div>
      </div>
    </div>
  `;
}

/* ── Scope banner ───────────────────────────────────────── */
function buildScopeBanner(perms) {
  const allowed = perms.allowed.filter(f => !['id'].includes(f));
  return `
    <div class="scope-banner">
      <div class="scope-lbl">// ACCESS SCOPE — ${perms.role.toUpperCase()}</div>
      <div class="scope-chips">
        ${allowed.map(f => `<span class="chip chip-y">✓ ${f}</span>`).join('')}
        ${perms.denied.map(f => `<span class="chip chip-n">✕ ${f}</span>`).join('')}
      </div>
    </div>
  `;
}

/* ── Card helpers ───────────────────────────────────────── */
function card(title, body, status = 'ok') {
  const cls  = status === 'ok' ? 'tag-ok' : status === 'warn' ? 'tag-warn' : 'tag-deny';
  const text = status === 'ok' ? '● GRANTED' : status === 'warn' ? '⚠ GRANTED' : '✕ DENIED';
  return `
    <div class="data-card">
      <div class="card-head">
        <span class="card-title">${title}</span>
        <span class="card-tag ${cls}">${text}</span>
      </div>
      ${body}
    </div>
  `;
}

function deniedCard(title, reason = 'Outside permitted scope for this role') {
  return `
    <div class="data-card card-denied">
      <div class="card-head">
        <span class="card-title">${title}</span>
        <span class="card-tag tag-deny">✕ DENIED</span>
      </div>
      <div style="height:76px;position:relative">
        <div class="deny-overlay">
          <span>🔒</span>
          <span>ACCESS DENIED</span>
          <span class="deny-reason">${reason}</span>
        </div>
      </div>
    </div>
  `;
}

function row(k, v, cls = '') {
  return `<div class="dr"><span class="dr-k">${k}</span><span class="dr-v ${cls}">${v}</span></div>`;
}

/* ── Individual sections ────────────────────────────────── */
function buildAllergies(p) {
  if (p._denied?.includes('allergies'))
    return deniedCard('ALLERGIES', 'Not in clinical scope for this role');

  const list = p.allergies ?? [];
  const hasSerious = list.some(a => ['SEVERE','ANAPHYLAXIS'].includes(a.severity));
  const body = list.length === 0
    ? row('Status', 'No known allergies on record', 'ok')
    : `<div class="allergy-list">${list.map(a => `
        <div class="al-item">
          <div>
            <div class="al-name">${a.substance}</div>
            <div class="al-reaction">${a.reaction}</div>
          </div>
          <span class="al-sev al-${a.severity}">${a.severity}</span>
        </div>`).join('')}</div>`;

  return card('ALLERGIES', body, hasSerious ? 'warn' : 'ok');
}

function buildMedications(p) {
  if (p._denied?.includes('medications'))
    return deniedCard('MEDICATIONS', 'Clinical data outside this role\'s scope');

  const meds = p.medications ?? [];
  const body = meds.length === 0
    ? row('Status', 'No current medications', '')
    : meds.map(m => row(m.name, `${m.dose} ${m.freq}`)).join('');
  return card('CURRENT MEDICATIONS', body, 'ok');
}

function buildVitals(p) {
  if (p._denied?.includes('vitals'))
    return deniedCard('VITALS', 'Outside permitted scope for this role');
  if (!p.vitals) return '';

  const v = p.vitals;
  const bpHi  = v.bp_systolic > 140;
  const spo2Lo = v.spo2 < 95;
  const tempHi = parseFloat(v.temp) > 38.0;

  const grid = `
    <div class="vitals-grid">
      <div class="vbox ${bpHi ? 'warn' : 'ok'}">
        <div class="vbox-lbl">Blood Pressure</div>
        <div class="vbox-val">${v.bp}</div>
        <div class="vbox-unit">mmHg</div>
      </div>
      <div class="vbox ok">
        <div class="vbox-lbl">Heart Rate</div>
        <div class="vbox-val">${v.hr}</div>
        <div class="vbox-unit">bpm</div>
      </div>
      <div class="vbox ${spo2Lo ? 'crit' : 'ok'}">
        <div class="vbox-lbl">SpO₂</div>
        <div class="vbox-val">${v.spo2}</div>
        <div class="vbox-unit">%</div>
      </div>
      <div class="vbox ${tempHi ? 'warn' : 'ok'}">
        <div class="vbox-lbl">Temperature</div>
        <div class="vbox-val">${v.temp}</div>
        <div class="vbox-unit">°C</div>
      </div>
      <div class="vbox ok">
        <div class="vbox-lbl">Resp Rate</div>
        <div class="vbox-val">${v.rr}</div>
        <div class="vbox-unit">/min</div>
      </div>
      <div class="vbox ok">
        <div class="vbox-lbl">GCS</div>
        <div class="vbox-val">${v.gcs}</div>
        <div class="vbox-unit">/15</div>
      </div>
    </div>
    ${row('Glucose', `${v.glucose} mmol/L`, parseFloat(v.glucose) > 10 ? 'warn' : 'ok')}
    ${row('Recorded', v.recordedAt)}
  `;
  return card('VITALS', grid, bpHi || spo2Lo || tempHi ? 'warn' : 'ok');
}

function buildImaging(p) {
  if (p._denied?.includes('imaging'))
    return deniedCard('IMAGING / RADIOLOGY', 'Radiological review outside this role\'s scope');

  const imgs = p.imaging ?? [];
  if (!imgs.length) return card('IMAGING / RADIOLOGY', row('Status', 'No recent imaging', ''), 'ok');

  const body = imgs.map(img => `
    <div style="padding:6px 0;border-bottom:1px solid var(--b1)">
      ${row('Type',    `${img.type} — ${img.region}`)}
      ${row('Finding', img.finding)}
      ${row('Date',    img.date)}
      ${row('By',      img.radiologist)}
    </div>`).join('');
  return card('IMAGING / RADIOLOGY', body, 'ok');
}

function buildSurgeries(p) {
  if (p._denied?.includes('surgeries'))
    return deniedCard('SURGICAL HISTORY', 'Historical surgical data outside clinical scope');

  const surg = p.surgeries ?? [];
  if (!surg.length) return card('SURGICAL HISTORY', row('Status', 'No surgical history on record', ''), 'ok');

  const body = surg.map(s =>
    row(String(s.year), `${s.procedure} <span style="color:var(--tx-lo);font-size:9px;font-family:var(--mono)">— ${s.surgeon}</span>`)
  ).join('');
  return card('SURGICAL HISTORY', body, 'ok');
}

function buildLabs(p) {
  if (p._denied?.includes('labs'))
    return deniedCard('LAB RESULTS', 'Clinical interpretation data — outside this role\'s scope');
  if (!p.labs) return '';

  const l = p.labs;
  const body = [
    row('HbA1c',       `${l.hba1c}%`,         parseFloat(l.hba1c) > 7    ? 'warn' : 'ok'),
    row('Cholesterol', `${l.cholesterol} mmol/L`, parseFloat(l.cholesterol) > 5.5 ? 'warn' : 'ok'),
    row('eGFR',        `${l.egfr} mL/min`,     l.egfr < 60 ? 'warn' : 'ok'),
    row('WBC',         `${l.wbc} ×10⁹/L`,      ''),
    row('Hgb',         `${l.hgb} g/dL`,        parseFloat(l.hgb) < 12    ? 'warn' : 'ok'),
    row('INR',         l.inr,                   parseFloat(l.inr) > 2.5   ? 'warn' : 'ok'),
    row('Collected',   l.takenAt,               ''),
  ].join('');
  return card('LAB RESULTS', body, 'ok');
}

function buildPsych(p) {
  if (p._denied?.includes('psych'))
    return deniedCard('PSYCHIATRIC RECORDS', 'Protected category — treating mental health staff only');
  if (!p.psych) return '';

  const ps = p.psych;
  const meds = (ps.medications ?? []).map(m => row(m.name, `${m.dose} ${m.freq}`)).join('');
  const body = [
    row('Primary Dx',  `${ps.primaryDiagnosis?.name ?? '—'} <span style="font-family:var(--mono);font-size:9px;color:var(--tx-lo)">${ps.primaryDiagnosis?.code ?? ''}</span>`),
    row('Sessions',    `${ps.sessionCount} (ongoing)`),
    row('Last session',ps.lastSession),
    row('Risk level',  ps.riskLevel, ps.riskLevel === 'LOW' ? 'ok' : ps.riskLevel === 'HIGH' ? 'crit' : 'warn'),
    row('Therapist',   ps.therapist),
    row('Notes',       ps.notes),
    meds ? `<div class="card-sub">PSYCH MEDICATIONS</div>${meds}` : '',
  ].join('');
  return card('PSYCHIATRIC RECORDS', body, 'ok');
}

function buildAdmin(p) {
  if (!p.insurance && !p.nextOfKin && !p.phone) return '';
  if (p._denied?.includes('insurance')) return '';

  const nok = p.nextOfKin;
  const body = [
    p.insurance ? row('Insurance',  p.insurance)  : '',
    p.phone     ? row('Phone',      p.phone)       : '',
    p.email     ? row('Email',      p.email)       : '',
    p.address   ? row('Address',    p.address)     : '',
    nok ? `<div class="card-sub">NEXT OF KIN</div>
           ${row('Name',     nok.name)}
           ${row('Relation', nok.relation)}
           ${row('Phone',    nok.phone)}` : '',
  ].join('');
  return card('ADMINISTRATIVE', body, 'ok');
}
