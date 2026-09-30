/**
 * Login screen - role selection + authentication
 */

const ROLE_DEFS = {
  er_doctor:    { icon: '🚨', name: 'ER_DOCTOR',    dept: 'Emergency Department',    color: '#ff3d5a' },
  nurse:        { icon: '💉', name: 'NURSE',         dept: 'General Ward',             color: '#3d9eff' },
  admin:        { icon: '🗂️',  name: 'ADMIN',         dept: 'Hospital Administration',  color: '#ffaa00' },
  psychiatrist: { icon: '🧠', name: 'PSYCHIATRIST', dept: 'Mental Health Unit',        color: '#a855f7' },
  surgeon:      { icon: '🔪', name: 'SURGEON',      dept: 'Surgical Unit',             color: '#00d4aa' },
};

const DEFAULT_CONTEXTS = {
  er_doctor:    'Trauma assessment - broken arm',
  nurse:        'Routine blood pressure check',
  admin:        'Appointment scheduling',
  psychiatrist: 'Therapy session review',
  surgeon:      'Pre-operative assessment',
};

let _selectedRole = null;

function initLogin() {
  const grid = document.getElementById('role-grid');
  grid.innerHTML = Object.entries(ROLE_DEFS).map(([key, r]) => `
    <button class="role-card" data-role="${key}"
            style="--rc:${r.color}"
            onclick="selectRole('${key}')">
      <span class="rc-icon">${r.icon}</span>
      <span class="rc-name">${r.name}</span>
      <span class="rc-dept">${r.dept}</span>
    </button>
  `).join('');
}

function selectRole(role) {
  _selectedRole = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-role="${role}"]`).classList.add('selected');

  const btn = document.getElementById('login-btn');
  btn.disabled = false;
  document.getElementById('login-btn-text').textContent =
    `AUTHENTICATE AS ${ROLE_DEFS[role].name}`;

  // Pre-fill context if blank or is a default
  const ctx = document.getElementById('context-input');
  const isDefault = Object.values(DEFAULT_CONTEXTS).includes(ctx.value) || ctx.value === '';
  if (isDefault) ctx.value = DEFAULT_CONTEXTS[role];
}

async function doLogin() {
  if (!_selectedRole) return;

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  document.getElementById('login-btn-text').textContent = 'AUTHENTICATING…';

  const context = document.getElementById('context-input').value.trim()
                || DEFAULT_CONTEXTS[_selectedRole];

  try {
    const result = await API.auth.login(_selectedRole, context);
    if (result.ok) {
      scanTransition(() => {
        showScreen('dashboard-screen');
        initDashboard(result.user).catch(err => console.error('dashboard failed to load', err));
      });
    } else {
      throw new Error('login failed');
    }
  } catch {
    btn.disabled = false;
    document.getElementById('login-btn-text').textContent = 'AUTHENTICATION FAILED - RETRY';
  }
}

document.getElementById('login-btn').addEventListener('click', doLogin);
