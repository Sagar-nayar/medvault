/**
 * App bootstrap
 * Screen switching, scan transition, session restore on page load.
 */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function scanTransition(cb) {
  const line = document.createElement('div');
  line.className = 'scan-line';
  document.body.appendChild(line);
  setTimeout(() => { cb(); setTimeout(() => line.remove(), 400); }, 640);
}

// shows which env + version youre looking at (staging vs prod) in the corner
async function showBuildInfo() {
  try {
    const res  = await fetch('/health');
    const info = await res.json();
    const label = `${String(info.env).toUpperCase()} · v${info.version}`;
    document.getElementById('brand-ver').textContent = `v${info.version}`;
    const pill = document.getElementById('env-pill');
    pill.textContent = label;
    pill.dataset.env = info.env;
  } catch {
    // just cosmetic, doesnt matter if it fails
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  initLogin();
  void showBuildInfo(); // fire and forget on purpose, it handles its own errors

  // Restore session if cookie is still valid
  try {
    const user = await API.auth.me();
    if (user?.role) {
      showScreen('dashboard-screen');
      await initDashboard(user);
    } else {
      showScreen('login-screen');
    }
  } catch {
    showScreen('login-screen');
  }
});
