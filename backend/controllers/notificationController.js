const { Notification } = require('../models');

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('related_blog', 'slug title');
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.is_read = true;
    await notification.save();
    res.json({ message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, is_read: false }, { is_read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
