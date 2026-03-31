/**
 * Audit log drawer — live access monitoring
 */

let _auditPoll = null;

function toggleAudit() {
  const drawer = document.getElementById('audit-drawer');
  const btn    = document.getElementById('audit-btn');
  const open   = drawer.classList.toggle('open');
  btn.classList.toggle('active', open);
  if (open) refreshAudit();
}

function closeAudit() {
  document.getElementById('audit-drawer').classList.remove('open');
  document.getElementById('audit-btn').classList.remove('active');
}

async function refreshAudit() {
  const [data, stats] = await Promise.all([
    API.audit.log('limit=80'),
    API.audit.stats(),
  ]);
  if (stats) renderStats(stats);
  if (data)  renderFeed(data.entries ?? []);
}

function renderStats(s) {
  document.getElementById('audit-stats').innerHTML = `
    <div class="as-cell"><span class="as-num">${s.total}</span><span class="as-lbl">TOTAL</span></div>
    <div class="as-cell"><span class="as-num g">${s.granted}</span><span class="as-lbl">GRANTED</span></div>
    <div class="as-cell"><span class="as-num r">${s.denied}</span><span class="as-lbl">DENIED</span></div>
    <div class="as-cell"><span class="as-num a">${s.highSeverity}</span><span class="as-lbl">FLAGGED</span></div>
  `;
}

function renderFeed(entries) {
  const el = document.getElementById('audit-feed');
  if (!entries.length) {
    el.innerHTML = '<div class="ae-none">No events yet</div>';
    return;
  }
  el.innerHTML = entries.map(e => `
    <div class="ae">
      <div class="ae-row1">
        <span class="ae-time">${e.timestamp}</span>
        <span class="ae-act">${e.action}</span>
        <span class="ae-stat st-${e.status}">${e.status}</span>
      </div>
      <div class="ae-detail">${e.details}</div>
      <div class="ae-role">${e.roleLabel} · ${e.resource}</div>
    </div>
  `).join('');
}

function startAuditPoll() {
  _auditPoll = setInterval(() => {
    if (document.getElementById('audit-drawer').classList.contains('open')) {
      refreshAudit();
    }
  }, 4000);
}

function stopAuditPoll() {
  clearInterval(_auditPoll);
  _auditPoll = null;
}
