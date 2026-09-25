const { AdminAuditLog } = require('../models');
const { getActiveDeviceCounts } = require('../services/sessionService');

const AUDIT_LOG_LIMIT = 500;

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AdminAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(AUDIT_LOG_LIMIT)
      .populate({ path: 'actor', select: 'id name role avatar_url' });

    const actorIds = [...new Set(logs.map((log) => log.actor?.id).filter(Boolean))];
    const deviceCounts = await getActiveDeviceCounts(actorIds);

    const logsWithDevices = logs.map((log) => {
      const json = log.toJSON();
      json.actor_active_devices = json.actor ? deviceCounts[String(json.actor.id)] || 0 : 0;
      return json;
    });

    res.json({ logs: logsWithDevices });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
