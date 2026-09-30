/**
 * MedVault API Client
 * Thin fetch wrapper - all HTTP calls live here.
 */
const API = {
  async _get(url) {
    const res = await fetch(url, { credentials: 'include' });
    if (res.status === 401) { return null; }
    return res.json();
  },
  async _post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  auth: {
    login:  (role, context) => API._post('/api/auth/login', { role, context }),
    logout: ()              => API._post('/api/auth/logout', {}),
    me:     ()              => API._get('/api/auth/me'),
  },

  patients: {
    list:        ()          => API._get('/api/patients'),
    get:         (id)        => API._get(`/api/patients/${id}`),
    permissions: (id)        => API._get(`/api/patients/${id}/permissions`),
  },

  audit: {
    log:   (qs = '')  => API._get(`/api/audit?${qs}`),
    stats: ()         => API._get('/api/audit/stats'),
  },
};
