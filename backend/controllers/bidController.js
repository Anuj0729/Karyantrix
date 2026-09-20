const { Bid, Requirement, Notification, Review, Booking } = require('../models');
const { emitToUser, emitBroadcast } = require('../sockets/socketHandler');
const { computeSplit } = require('../utils/payments');
const { canProviderViewRequirement } = require('../utils/requirementAccess');

const DEFAULT_ADVANCE_PERCENT = 20;

const notify = async (userId, title, message, extra = {}) => {
  const notification = await Notification.create({ user: userId, title, message, type: 'bid', ...extra });
  emitToUser(userId, 'notification', notification);
  return notification;
};

const placeBid = async (req, res, next) => {
  try {
    const { amount, message } = req.body;
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ message: 'A bid amount is required' });
    }
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Bid amount must be a positive number' });
    }

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'This requirement is no longer open for bids' });
    }
    if (requirement.post_type === 'fixed') {
      return res.status(400).json({ message: 'This is a fixed-price post - express interest instead of bidding' });
    }
    if (requirement.target_provider && requirement.target_provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This booking request was sent to a different provider' });
    }

    const bid = await Bid.create({
      requirement: requirement.id,
      provider: req.user.id,
      amount: amountNum,
      message: message || null,
    });

    const populated = await bid.populate({ path: 'provider', select: 'id name avatar_url' });

    emitToUser(requirement.customer, 'requirement_bid', {
      requirement_id: requirement.id,
      bid: populated,
    });
    // Providers who are viewing this requirement's bids refetch (the API re-checks who may see them).
    // Deliberately carries only the id: bid details must not be pushed to providers who can't see the post.
    emitBroadcast('requirement_bids_changed', { requirement_id: requirement.id });
    await notify(
      requirement.customer,
      'New bid on your post',
      `${req.user.name} bid \u20b9${amountNum} on your "${requirement.services.join(', ')}" requirement`,
      { related_requirement: requirement.id }
    );

    res.status(201).json({ message: 'Bid placed', bid: populated });
  } catch (error) {
    next(error);
  }
};

// Providers who can see a post can see everyone's bids on it, so they know what they're competing against.
const getBidsForProvider = async (requirement, req, res) => {
  if (!(await canProviderViewRequirement(requirement, req.user.id))) {
    return res.status(403).json({ message: 'This requirement is not available to you' });
  }

  const allBids = await Bid.find({ requirement: requirement.id })
    .populate({ path: 'provider', select: 'id name avatar_url' })
    .sort({ createdAt: -1 });

  // A provider can revise their bid by posting a new one; only their latest is a live offer.
  const seen = new Set();
  const bids = [];
  allBids.forEach((bid) => {
    const bidderId = String(bid.provider?.id || bid.provider);
    if (seen.has(bidderId)) return;
    seen.add(bidderId);
    bids.push({ ...bid.toJSON(), is_mine: bidderId === String(req.user.id) });
  });

  return res.json({
    requirement_id: requirement.id,
    budget: requirement.budget,
    requirement_status: requirement.status,
    viewer_role: 'provider',
    bids,
  });
};

const getBids = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (req.user.role === 'provider') return await getBidsForProvider(requirement, req, res);
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only view bids on your own requirement' });
    }

    const bids = await Bid.find({ requirement: requirement.id })
      .populate({ path: 'provider', select: 'id name avatar_url' })
      .sort({ createdAt: -1 });

    const review = requirement.status === 'closed' ? await Review.findOne({ requirement: requirement.id }) : null;
    const booking = requirement.status === 'closed' ? await Booking.findOne({ requirement: requirement.id }).select('id status') : null;

    res.json({
      requirement_id: requirement.id,
      budget: requirement.budget,
      requirement_status: requirement.status,
      hired_provider: requirement.hired_provider,
      reviewed: !!review,
      review,
      booking_status: booking ? booking.status : null,
      bids,
    });
  } catch (error) {
    next(error);
  }
};

const getMyBids = async (req, res, next) => {
  try {
    const bids = await Bid.find({ provider: req.user.id })
      .populate({ path: 'requirement', select: 'id services description budget status customer' })
      .sort({ createdAt: -1 });
    res.json({ bids });
  } catch (error) {
    next(error);
  }
};

const acceptBid = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only accept bids on your own requirement' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'This requirement is already closed' });
    }

    const bid = await Bid.findOne({ _id: req.params.bidId, requirement: requirement.id });
    if (!bid) return res.status(404).json({ message: 'Bid not found on this requirement' });
    if (bid.status !== 'pending') {
      return res.status(400).json({ message: 'This bid is no longer pending' });
    }

    bid.status = 'accepted';
    await bid.save();

    await Bid.updateMany(
      { requirement: requirement.id, _id: { $ne: bid.id }, status: 'pending' },
      { $set: { status: 'rejected' } }
    );

    requirement.status = 'closed';
    requirement.hired_provider = bid.provider;
    requirement.hired_bid = bid.id;
    requirement.hired_at = new Date();
    await requirement.save();

    const advancePercent = Number(process.env.BOOKING_ADVANCE_PERCENT) || DEFAULT_ADVANCE_PERCENT;
    const { advance_amount, balance_amount } = computeSplit(bid.amount, advancePercent);
    const booking = await Booking.create({
      requirement: requirement.id,
      bid: bid.id,
      customer: req.user.id,
      provider: bid.provider,
      total_amount: bid.amount,
      advance_percent: advancePercent,
      advance_amount,
      balance_amount,
    });

    await notify(
      bid.provider,
      'Your bid was accepted',
      `${req.user.name} hired you for their "${requirement.services.join(', ')}" requirement`,
      { related_requirement: requirement.id }
    );
    emitToUser(bid.provider, 'bid_accepted', { requirement_id: requirement.id, bid_id: bid.id });
    emitToUser(bid.provider, 'bid_status_changed', {
      requirement_id: requirement.id,
      bid_id: bid.id,
      status: 'accepted',
    });

    const rejectedBids = await Bid.find({ requirement: requirement.id, status: 'rejected' });
    await Promise.all(
      rejectedBids.map((b) =>
        notify(
          b.provider,
          'Requirement filled',
          `${req.user.name} hired someone else for their "${requirement.services.join(', ')}" requirement`,
          { related_requirement: requirement.id }
        )
      )
    );
    rejectedBids.forEach((b) => {
      emitToUser(b.provider, 'bid_status_changed', {
        requirement_id: requirement.id,
        bid_id: b.id,
        status: 'rejected',
      });
    });

    emitToUser(req.user.id, 'requirement_status_changed', {
      requirement_id: requirement.id,
      status: requirement.status,
      hired_provider: requirement.hired_provider,
    });

    emitBroadcast('requirement_closed', { requirement_id: requirement.id });

    res.json({ message: 'Bid accepted, provider hired', requirement, bid, booking });
  } catch (error) {
    next(error);
  }
};

const hireInterestedProvider = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only hire on your own requirement' });
    }
    if (requirement.post_type !== 'fixed') {
      return res.status(400).json({ message: 'This requirement is not set up for direct hiring' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'This requirement is already closed' });
    }

    const interest = requirement.interested_providers.find(
      (i) => i.provider.toString() === req.params.providerId
    );
    if (!interest) {
      return res.status(404).json({ message: 'This provider has not expressed interest in this requirement' });
    }

    const bid = await Bid.create({
      requirement: requirement.id,
      provider: interest.provider,
      amount: requirement.budget,
      message: interest.message,
      status: 'accepted',
    });

    requirement.status = 'closed';
    requirement.hired_provider = interest.provider;
    requirement.hired_bid = bid.id;
    requirement.hired_at = new Date();
    await requirement.save();

    const advancePercent = Number(process.env.BOOKING_ADVANCE_PERCENT) || DEFAULT_ADVANCE_PERCENT;
    const { advance_amount, balance_amount } = computeSplit(bid.amount, advancePercent);
    const booking = await Booking.create({
      requirement: requirement.id,
      bid: bid.id,
      customer: req.user.id,
      provider: interest.provider,
      total_amount: bid.amount,
      advance_percent: advancePercent,
      advance_amount,
      balance_amount,
    });

    await notify(
      interest.provider,
      "You've been hired",
      `${req.user.name} hired you for their "${requirement.services.join(', ')}" requirement`,
      { related_requirement: requirement.id }
    );
    emitToUser(interest.provider, 'bid_accepted', { requirement_id: requirement.id, bid_id: bid.id });
    emitToUser(interest.provider, 'bid_status_changed', {
      requirement_id: requirement.id,
      bid_id: bid.id,
      status: 'accepted',
    });

    const others = requirement.interested_providers.filter(
      (i) => i.provider.toString() !== interest.provider.toString()
    );
    await Promise.all(
      others.map((i) =>
        notify(
          i.provider,
          'Requirement filled',
          `${req.user.name} hired someone else for their "${requirement.services.join(', ')}" requirement`,
          { related_requirement: requirement.id }
        )
      )
    );

    emitToUser(req.user.id, 'requirement_status_changed', {
      requirement_id: requirement.id,
      status: requirement.status,
      hired_provider: requirement.hired_provider,
    });
    emitBroadcast('requirement_closed', { requirement_id: requirement.id });

    res.json({ message: 'Provider hired', requirement, bid, booking });
  } catch (error) {
    next(error);
  }
};

module.exports = { placeBid, getBids, getMyBids, acceptBid, hireInterestedProvider };
