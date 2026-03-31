/**
 * Dashboard — topbar, patient list, search, logout
 */

let _allPatients  = [];
let _currentUser  = null;  // also read by patient.js

async function initDashboard(user) {
  _currentUser = user;

  // Role badge
  const color = {
    er_doctor: '#ff3d5a', nurse: '#3d9eff', admin: '#ffaa00',
    psychiatrist: '#a855f7', surgeon: '#00d4aa',
  }[user.role] ?? '#00e87a';

  const badge = document.getElementById('role-badge');
  badge.textContent = `ACCESS: ${user.roleInfo.label.toUpperCase()}`;
  badge.style.cssText = `color:${color};border-color:${color};background:${color}18`;

  // Root CSS accent (picked up by patient view)
  document.documentElement.style.setProperty('--role-accent', color);

  document.getElementById('session-meta').innerHTML =
    `SESSION: ${new Date(user.loginAt).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}<br>` +
    `${user.context}`;

  // Load patient list
  _allPatients = await API.patients.list();
  renderList(_allPatients);

  // Search
  document.getElementById('patient-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderList(_allPatients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)  ||
      p.ward.toLowerCase().includes(q)
    ));
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.auth.logout();
    scanTransition(() => {
      showScreen('login-screen');
      resetDashboard();
    });
  });

  // Audit
  document.getElementById('audit-btn').addEventListener('click', toggleAudit);
  document.getElementById('audit-close').addEventListener('click', closeAudit);
  startAuditPoll();
}

function renderList(patients) {
  document.getElementById('sidebar-count').textContent = patients.length;
  const list = document.getElementById('patient-list');

  if (!patients.length) {
    list.innerHTML = '<div class="p-none">No patients found</div>';
    return;
  }

  list.innerHTML = patients.map(p => `
    <div class="p-item" data-id="${p.id}" onclick="loadPatient('${p.id}')">
      <div class="p-name">${p.name}</div>
      <div class="p-meta"><span>${p.age}${p.sex}</span><span>${p.mrn}</span></div>
      <span class="p-ward">${p.ward}</span>
    </div>
  `).join('');
}

function resetDashboard() {
  _allPatients = [];
  _currentUser = null;
  document.getElementById('patient-list').innerHTML = '';
  document.getElementById('patient-view').innerHTML = '';
  document.getElementById('patient-view').classList.add('hidden');
  document.getElementById('empty-state').classList.remove('hidden');
  document.getElementById('audit-drawer').classList.remove('open');
  document.getElementById('audit-btn').classList.remove('active');
  stopAuditPoll();
}
