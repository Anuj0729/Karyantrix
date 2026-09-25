const mongoose = require('mongoose');
const { UserSession } = require('../models');

// Matches the default refresh-token lifetime — a session with no activity in
// this window no longer counts as an actively logged-in device.
const ACTIVE_WINDOW_MS = process.env.REFRESH_TOKEN_EXPIRES_MS
  ? parseInt(process.env.REFRESH_TOKEN_EXPIRES_MS, 10)
  : 7 * 24 * 60 * 60 * 1000;

const parseDeviceLabel = (userAgent) => {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent;

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
};

// Creates a session record for a freshly issued login (password, OTP, Google,
// or fresh registration). The returned session's id is embedded as `sid` in
// the JWTs so future refresh calls can be tied back to this device.
const createSession = async (user, req) => {
  const userAgent = req.headers['user-agent'] || null;
  return UserSession.create({
    user: user.id || user._id,
    user_agent: userAgent,
    device_label: parseDeviceLabel(userAgent),
    ip: req.ip,
  });
};

// Called on token refresh, which happens periodically while a device stays
// logged in — this is what keeps a session "active" for device-count purposes.
const touchSession = async (sessionId) => {
  if (!sessionId || !mongoose.isValidObjectId(sessionId)) return;
  try {
    await UserSession.updateOne({ _id: sessionId, revoked_at: null }, { last_seen_at: new Date() });
  } catch (error) {
    // Best-effort — never block a refresh over session bookkeeping.
  }
};

// Logout currently invalidates every device at once (tokenVersion bump), so
// mirror that by revoking all of the user's sessions too.
const revokeAllSessions = async (userId) => {
  await UserSession.updateMany({ user: userId, revoked_at: null }, { revoked_at: new Date() });
};

const getActiveDeviceCount = async (userId) => {
  const counts = await getActiveDeviceCounts([userId]);
  return counts[String(userId)] || 0;
};

// Bulk variant used by the admin audit log so we don't run one query per row.
const getActiveDeviceCounts = async (userIds) => {
  const ids = (userIds || [])
    .filter(Boolean)
    .map(String)
    .filter((id, index, arr) => mongoose.isValidObjectId(id) && arr.indexOf(id) === index)
    .map((id) => new mongoose.Types.ObjectId(id));

  if (ids.length === 0) return {};

  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows = await UserSession.aggregate([
    { $match: { user: { $in: ids }, revoked_at: null, last_seen_at: { $gte: since } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);

  return rows.reduce((map, row) => {
    map[String(row._id)] = row.count;
    return map;
  }, {});
};

module.exports = {
  parseDeviceLabel,
  createSession,
  touchSession,
  revokeAllSessions,
  getActiveDeviceCount,
  getActiveDeviceCounts,
};
