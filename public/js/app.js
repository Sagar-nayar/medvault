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

window.addEventListener('DOMContentLoaded', async () => {
  initLogin();

  // Restore session if cookie is still valid
  try {
    const user = await API.auth.me();
    if (user?.role) {
      showScreen('dashboard-screen');
      initDashboard(user);
    } else {
      showScreen('login-screen');
    }
  } catch {
    showScreen('login-screen');
  }
});
