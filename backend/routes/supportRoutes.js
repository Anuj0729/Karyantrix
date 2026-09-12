const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createTicket, getMyTickets, getTicketById, addMessage } = require('../controllers/supportController');

const router = express.Router();

router.post('/', protect, authorize('customer', 'provider'), createTicket);
router.get('/mine', protect, authorize('customer', 'provider'), getMyTickets);
router.get('/:id', protect, getTicketById);
router.post('/:id/messages', protect, addMessage);

module.exports = router;
