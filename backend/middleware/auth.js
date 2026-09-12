const jwt = require('jsonwebtoken');
const { User, ProviderProfile } = require('../models');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    const tokenVersionInToken = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
    if ((user.tokenVersion || 0) !== tokenVersionInToken) {
      return res.status(401).json({ message: 'Token has been revoked, please log in again' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) return next();

    const tokenVersionInToken = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
    if ((user.tokenVersion || 0) !== tokenVersionInToken) return next();

    req.user = user;
    next();
  } catch (error) {
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

const authorizeProviderOrApplicant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    if (req.user.role === 'provider') return next();

    if (req.user.role === 'customer') {
      const profile = await ProviderProfile.findOne({ user: req.user.id }).select('application_status');
      if (profile && profile.application_status !== 'rejected') {
        return next();
      }
    }

    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, authorize, authorizeProviderOrApplicant, optionalAuth };
