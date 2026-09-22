const { SupportTicket, User, Notification } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');
const { ADMIN_ROLES, isAdminRole } = require('../utils/roles');

const CATEGORIES = ['payment', 'payout', 'booking', 'account', 'technical', 'other'];
const OPEN_STATUSES = ['open', 'in_progress'];

const notify = async (userId, title, message) => {
  const notification = await Notification.create({ user: userId, title, message, type: 'support' });
  emitToUser(userId.toString(), 'notification', notification);
};

const notifyAllAdmins = async (title, message) => {
  const admins = await User.find({ role: { $in: ADMIN_ROLES } }).select('_id');
  await Promise.all(admins.map((a) => notify(a._id, title, message)));
};

const canAccessTicket = (ticket, user) => isAdminRole(user.role) || ticket.user.toString() === user.id;

const createTicket = async (req, res, next) => {
  try {
    const { subject, category, message, related_booking, related_requirement } = req.body;

    if (!subject?.trim() || !category || !message?.trim()) {
      return res.status(400).json({ message: 'subject, category and message are required' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `category must be one of: ${CATEGORIES.join(', ')}` });
    }

    const ticket = await SupportTicket.create({
      user: req.user.id,
      user_role: req.user.role,
      category,
      subject: subject.trim(),
      related_booking: related_booking || null,
      related_requirement: related_requirement || null,
      messages: [{ sender: req.user.id, sender_role: req.user.role, message: message.trim() }],
      last_message_at: new Date(),
    });

    await notifyAllAdmins(
      'New support ticket',
      `${req.user.name || 'A user'} raised a ticket: "${ticket.subject}" (${category}).`
    );

    res.status(201).json({ message: 'Support ticket submitted. Our team will get back to you soon.', ticket });
  } catch (error) {
    next(error);
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { user: req.user.id };
    if (status && status !== 'all') where.status = status;

    const tickets = await SupportTicket.find(where)
      .select('-messages')
      .sort({ last_message_at: -1 });

    res.json({ tickets });
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate({ path: 'user', select: 'id name email phone avatar_url role' })
      .populate({ path: 'messages.sender', select: 'id name avatar_url role' })
      .populate({ path: 'related_booking', select: 'id total_amount status' })
      .populate({ path: 'related_requirement', select: 'id title' })
      .populate({ path: 'resolved_by', select: 'id name' });

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!canAccessTicket(ticket, req.user)) return res.status(403).json({ message: 'You cannot view this ticket' });

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'message is required' });

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!canAccessTicket(ticket, req.user)) return res.status(403).json({ message: 'You cannot reply to this ticket' });

    const senderRole = req.user.role;
    ticket.messages.push({ sender: req.user.id, sender_role: senderRole, message: message.trim() });
    ticket.last_message_at = new Date();

    if (isAdminRole(senderRole)) {
      if (ticket.status === 'open') ticket.status = 'in_progress';
      await ticket.save();
      await notify(ticket.user, `Reply on your ticket: ${ticket.subject}`, message.trim().slice(0, 200));
    } else {
      if (['resolved', 'closed'].includes(ticket.status)) {
        ticket.status = 'in_progress';
        ticket.resolved_at = null;
        ticket.resolved_by = null;
      }
      await ticket.save();
      await notifyAllAdmins('New reply on a support ticket', `${req.user.name} replied on "${ticket.subject}".`);
    }

    await ticket.populate({ path: 'messages.sender', select: 'id name avatar_url role' });
    res.status(201).json({ message: 'Message sent', ticket });
  } catch (error) {
    next(error);
  }
};

const getAllTickets = async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;
    const where = {};
    if (status && status !== 'all') {
      where.status = status === 'unresolved' ? { $in: OPEN_STATUSES } : status;
    }
    if (category && category !== 'all') where.category = category;
    if (priority && priority !== 'all') where.priority = priority;

    const tickets = await SupportTicket.find(where)
      .select('-messages')
      .populate({ path: 'user', select: 'id name email phone avatar_url role' })
      .sort({ last_message_at: -1 })
      .limit(300);

    res.json({ tickets });
  } catch (error) {
    next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, priority } = req.body;
    const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
    const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (priority) ticket.priority = priority;
    if (status) {
      ticket.status = status;
      if (['resolved', 'closed'].includes(status)) {
        ticket.resolved_by = req.user.id;
        ticket.resolved_at = new Date();
      } else {
        ticket.resolved_by = null;
        ticket.resolved_at = null;
      }
    }
    await ticket.save();

    if (status && ['resolved', 'closed'].includes(status)) {
      await notify(
        ticket.user,
        `Your ticket was marked ${status}`,
        `"${ticket.subject}" has been marked ${status} by our support team. Reply on the ticket if you still need help.`
      );
    }

    res.json({ message: 'Ticket updated', ticket });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  addMessage,
  getAllTickets,
  updateTicketStatus,
};
