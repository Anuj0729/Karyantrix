const { AdminAuditLog } = require('../models');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const ACTION_PATTERNS = [
  { method: 'PATCH', test: /^\/api\/admin\/users\/[^/]+\/toggle-active$/, label: 'Activated/deactivated a user' },
  { method: 'PATCH', test: /^\/api\/admin\/users\/[^/]+\/role$/, label: 'Changed a user\u2019s role' },
  { method: 'PATCH', test: /^\/api\/admin\/providers\/[^/]+\/approve$/, label: 'Approved/updated a provider' },
  { method: 'PATCH', test: /^\/api\/admin\/applications\/[^/]+\/review$/, label: 'Reviewed a provider application' },
  { method: 'PATCH', test: /^\/api\/admin\/reports\/[^/]+\/resolve$/, label: 'Resolved a report' },
  { method: 'PATCH', test: /^\/api\/admin\/support\/[^/]+\/status$/, label: 'Updated a support ticket status' },
  { method: 'PATCH', test: /^\/api\/admin\/wallet\/settings$/, label: 'Updated wallet settings' },
  { method: 'POST', test: /^\/api\/admin\/wallet\/payouts$/, label: 'Created a payout' },
  { method: 'POST', test: /^\/api\/admin\/wallet\/refunds$/, label: 'Created a refund' },
  { method: 'PATCH', test: /^\/api\/admin\/wallet\/transactions\/[^/]+\/resolve$/, label: 'Resolved a wallet transaction' },
  { method: 'POST', test: /^\/api\/admin\/categories$/, label: 'Created a category' },
  { method: 'PUT', test: /^\/api\/admin\/categories\/[^/]+$/, label: 'Updated a category' },
  { method: 'DELETE', test: /^\/api\/admin\/categories\/[^/]+$/, label: 'Deleted a category' },
  { method: 'POST', test: /^\/api\/admin\/service-catalog$/, label: 'Created a service catalog entry' },
  { method: 'PUT', test: /^\/api\/admin\/service-catalog\/[^/]+$/, label: 'Updated a service catalog entry' },
  { method: 'DELETE', test: /^\/api\/admin\/service-catalog\/[^/]+$/, label: 'Deleted a service catalog entry' },
  { method: 'POST', test: /^\/api\/admin\/blogs\/upload-cover$/, label: 'Uploaded a blog cover image' },
  { method: 'POST', test: /^\/api\/admin\/blogs$/, label: 'Created a blog post' },
  { method: 'PUT', test: /^\/api\/admin\/blogs\/[^/]+$/, label: 'Updated a blog post' },
  { method: 'DELETE', test: /^\/api\/admin\/blogs\/[^/]+$/, label: 'Deleted a blog post' },

  // Customer actions
  { method: 'POST', test: /^\/api\/requirements$/, label: 'Posted a requirement' },
  { method: 'PUT', test: /^\/api\/requirements\/[^/]+$/, label: 'Updated a requirement' },
  { method: 'DELETE', test: /^\/api\/requirements\/[^/]+$/, label: 'Deleted a requirement' },
  { method: 'PATCH', test: /^\/api\/requirements\/[^/]+\/interested\/[^/]+\/hire$/, label: 'Hired an interested provider' },
  { method: 'PATCH', test: /^\/api\/requirements\/[^/]+\/close$/, label: 'Closed a requirement' },
  { method: 'PATCH', test: /^\/api\/requirements\/[^/]+\/bids\/[^/]+\/accept$/, label: 'Accepted a bid' },
  { method: 'POST', test: /^\/api\/bookings\/[^/]+\/advance\/order$/, label: 'Started an advance payment' },
  { method: 'POST', test: /^\/api\/bookings\/[^/]+\/advance\/verify$/, label: 'Paid a booking advance' },
  { method: 'POST', test: /^\/api\/bookings\/[^/]+\/balance\/order$/, label: 'Started a balance payment' },
  { method: 'POST', test: /^\/api\/bookings\/[^/]+\/balance\/verify$/, label: 'Paid a booking balance' },
  { method: 'POST', test: /^\/api\/bookings\/[^/]+\/cancel$/, label: 'Cancelled a booking' },
  { method: 'PATCH', test: /^\/api\/bookings\/[^/]+\/progress\/[^/]+\/respond$/, label: 'Responded to a progress update' },

  // Provider actions
  { method: 'POST', test: /^\/api\/requirements\/[^/]+\/interest$/, label: 'Expressed interest in a requirement' },
  { method: 'POST', test: /^\/api\/requirements\/[^/]+\/bids$/, label: 'Placed a bid' },
  { method: 'PATCH', test: /^\/api\/bookings\/[^/]+\/complete-work$/, label: 'Marked work as completed' },
  { method: 'PUT', test: /^\/api\/providers\/me$/, label: 'Updated provider profile' },
  { method: 'POST', test: /^\/api\/providers\/become$/, label: 'Applied to become a provider' },
  { method: 'PUT', test: /^\/api\/providers\/application\/me$/, label: 'Updated a provider application' },
  { method: 'POST', test: /^\/api\/providers\/application\/submit$/, label: 'Submitted a provider application' },
  { method: 'POST', test: /^\/api\/providers\/switch-to-customer$/, label: 'Switched to customer mode' },
  { method: 'POST', test: /^\/api\/providers\/switch-to-provider$/, label: 'Switched to provider mode' },

  // Shared customer/provider actions
  { method: 'POST', test: /^\/api\/reviews$/, label: 'Submitted a review' },
  { method: 'PATCH', test: /^\/api\/reviews\/[^/]+$/, label: 'Updated a review' },
  { method: 'POST', test: /^\/api\/reports$/, label: 'Filed a report' },
  { method: 'POST', test: /^\/api\/support$/, label: 'Opened a support ticket' },
  { method: 'POST', test: /^\/api\/support\/[^/]+\/messages$/, label: 'Replied on a support ticket' },
  { method: 'POST', test: /^\/api\/chats\/start$/, label: 'Started a conversation' },
  { method: 'POST', test: /^\/api\/chats\/[^/]+\/messages$/, label: 'Sent a chat message' },
  { method: 'DELETE', test: /^\/api\/chats\/[^/]+\/messages\/[^/]+$/, label: 'Deleted a chat message' },

  // Auth / account
  { method: 'PUT', test: /^\/api\/auth\/me$/, label: 'Updated their profile' },
  { method: 'POST', test: /^\/api\/auth\/password\/change$/, label: 'Changed their password' },
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
  return params.id || params.userId || params.conversationId || params.uploadId || null;
}

const auditLog = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    if (!req.user) return;
    const path = req.originalUrl.split('?')[0];
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
      console.error('Failed to write audit log:', err.message);
    });
  });

  next();
};

module.exports = auditLog;
