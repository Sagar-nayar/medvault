import client from 'prom-client';

// prometheus metrics, served on GET /metrics
// own registry so tests dont trip over each other registering the same metric twice
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'medvault_' });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});

export const accessDecisionsTotal = new client.Counter({
  name: 'medvault_access_decisions_total',
  help: 'Zero-trust access decisions recorded in the audit log',
  labelNames: ['role', 'action', 'status'],
  registers: [registry],
});

export const accessDeniedTotal = new client.Counter({
  name: 'medvault_access_denied_total',
  help: 'Denied attempts to read restricted patient fields',
  labelNames: ['role', 'field'],
  registers: [registry],
});

export const loginsTotal = new client.Counter({
  name: 'medvault_logins_total',
  help: 'Successful logins by role',
  labelNames: ['role'],
  registers: [registry],
});

export const appInfo = new client.Gauge({
  name: 'medvault_app_info',
  help: 'Static build information (value is always 1)',
  labelNames: ['version', 'env', 'commit'],
  registers: [registry],
});

// times every request and counts it by route + status code
export function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    // use the route pattern (/api/patients/:id) not the real url, otherwise every patient id = a new time series
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : routeFallback(req);
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

function routeFallback(req) {
  if (req.path.startsWith('/api/')) return 'unmatched_api';
  return 'static';
}
