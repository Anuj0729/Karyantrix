const { AdminAuditLog } = require('../models');

const AUDIT_LOG_LIMIT = 500;

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AdminAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(AUDIT_LOG_LIMIT)
      .populate({ path: 'actor', select: 'id name role avatar_url' });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
