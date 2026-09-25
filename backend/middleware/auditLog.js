const { AdminAuditLog } = require('../models');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const ACTION_PATTERNS = [
  { method: 'PATCH', test: /^\/users\/[^/]+\/toggle-active$/, label: 'Activated/deactivated a user' },
  { method: 'PATCH', test: /^\/users\/[^/]+\/role$/, label: 'Changed a user\u2019s role' },
  { method: 'PATCH', test: /^\/providers\/[^/]+\/approve$/, label: 'Approved/updated a provider' },
  { method: 'PATCH', test: /^\/applications\/[^/]+\/review$/, label: 'Reviewed a provider application' },
  { method: 'PATCH', test: /^\/reports\/[^/]+\/resolve$/, label: 'Resolved a report' },
  { method: 'PATCH', test: /^\/support\/[^/]+\/status$/, label: 'Updated a support ticket status' },
  { method: 'PATCH', test: /^\/wallet\/settings$/, label: 'Updated wallet settings' },
  { method: 'POST', test: /^\/wallet\/payouts$/, label: 'Created a payout' },
  { method: 'POST', test: /^\/wallet\/refunds$/, label: 'Created a refund' },
  { method: 'PATCH', test: /^\/wallet\/transactions\/[^/]+\/resolve$/, label: 'Resolved a wallet transaction' },
  { method: 'POST', test: /^\/categories$/, label: 'Created a category' },
  { method: 'PUT', test: /^\/categories\/[^/]+$/, label: 'Updated a category' },
  { method: 'DELETE', test: /^\/categories\/[^/]+$/, label: 'Deleted a category' },
  { method: 'POST', test: /^\/service-catalog$/, label: 'Created a service catalog entry' },
  { method: 'PUT', test: /^\/service-catalog\/[^/]+$/, label: 'Updated a service catalog entry' },
  { method: 'DELETE', test: /^\/service-catalog\/[^/]+$/, label: 'Deleted a service catalog entry' },
  { method: 'POST', test: /^\/blogs\/upload-cover$/, label: 'Uploaded a blog cover image' },
  { method: 'POST', test: /^\/blogs$/, label: 'Created a blog post' },
  { method: 'PUT', test: /^\/blogs\/[^/]+$/, label: 'Updated a blog post' },
  { method: 'DELETE', test: /^\/blogs\/[^/]+$/, label: 'Deleted a blog post' },
];

const describeAction = (method, path) => {
  const match = ACTION_PATTERNS.find((p) => p.method === method && p.test.test(path));
  return match ? match.label : `${method} ${path}`;
};

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'token', 'otp', 'refreshToken', 'accessToken']);
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const entries = Object.entries(body).filter(([key]) => !SENSITIVE_KEYS.has(key));
  if (entries.length === 0) return undefined;
  return entries.reduce((clean, [key, value]) => {
    clean[key] = typeof value === 'string' && value.length > 300 ? `${value.slice(0, 300)}\u2026` : value;
    return clean;
  }, {});
};

const extractTargetId = (params) => {
  if (!params) return null;
  return params.id || params.userId || null;
}

const auditLog = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    if (!req.user) return;
    const path = req.path;
    AdminAuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      method: req.method,
      path,
      action: describeAction(req.method, path),
      target_id: extractTargetId(req.params),
      status_code: res.statusCode,
      success: res.statusCode < 400,
      meta: sanitizeBody(req.body),
      ip: req.ip,
    }).catch((err) => {
      console.error('Failed to write admin audit log:', err.message);
    });
  });

  next();
};

module.exports = auditLog;
