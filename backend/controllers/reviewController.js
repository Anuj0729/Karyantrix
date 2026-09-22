const { Review, Requirement, ProviderProfile, Booking, User } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');
const { isAdminRole } = require('../utils/roles');

const pickPortfolioImage = (booking, requirement) => {
  const updates = [...(booking?.progress_updates || [])].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const finalImage = updates.find((u) => u.is_final)?.media?.find((m) => m.type === 'image');
  if (finalImage) return finalImage.url;

  const anyImage = updates.flatMap((u) => u.media || []).find((m) => m.type === 'image');
  if (anyImage) return anyImage.url;

  const requirementImage = (requirement?.media || []).find((m) => m.type === 'image');
  return requirementImage?.url || null;
};

const addToPortfolio = async ({ requirement, review }) => {
  const booking = await Booking.findOne({ requirement: requirement.id });
  if (!booking || booking.status !== 'completed') return;

  const profile = await ProviderProfile.findOne({ user: requirement.hired_provider });
  if (!profile) return;

  profile.portfolio.push({
    image_url: pickPortfolioImage(booking, requirement),
    title: requirement.services.join(', ').slice(0, 150),
    description: (review.comment || requirement.description || '').slice(0, 500),
  });
  await profile.save();

  emitToUser(requirement.hired_provider, 'notification', {
    title: 'Job added to your portfolio',
    message: `"${requirement.services.join(', ')}" was automatically added to your portfolio after the final review.`,
  });
};

// Bump a provider's aggregate rating (ProviderProfile) up front. The "jobs completed" counter
// only moves for a review on an actually-completed booking - a review left after a cancellation
// is rating feedback, not a completed job.
const applyProviderRatingDelta = async (providerId, rating, { countsAsJob } = {}) => {
  const profile = await ProviderProfile.findOne({ user: providerId });
  if (!profile) return;
  const newTotal = profile.total_reviews + 1;
  const newAvg = (profile.avg_rating * profile.total_reviews + Number(rating)) / newTotal;
  profile.total_reviews = newTotal;
  profile.avg_rating = Math.round(newAvg * 10) / 10;
  if (countsAsJob) profile.total_jobs_completed = profile.total_jobs_completed + 1;
  await profile.save();
};

// Same idea, but for a customer's aggregate rating (kept on the User document since
// customers don't have a separate profile model). Mirrors applyProviderRatingDelta, including
// only bumping jobs-completed for an actually-completed booking.
const applyCustomerRatingDelta = async (customerId, rating, { countsAsJob } = {}) => {
  const user = await User.findById(customerId);
  if (!user) return;
  const newTotal = (user.customer_rating_count || 0) + 1;
  const newAvg = ((user.customer_rating_avg || 0) * (user.customer_rating_count || 0) + Number(rating)) / newTotal;
  user.customer_rating_count = newTotal;
  user.customer_rating_avg = Math.round(newAvg * 10) / 10;
  if (countsAsJob) user.customer_jobs_completed = (user.customer_jobs_completed || 0) + 1;
  await user.save();
};

// createReview handles both directions of the same review flow:
//   - a customer reviewing the provider they hired (author_role: 'customer'), and
//   - a provider reviewing the customer they worked for (author_role: 'provider'),
// once the booking on this requirement has actually been completed (not just hired/closed), OR
// once it's been cancelled - in the cancelled case only the side that did NOT cancel may review,
// as feedback on the side that backed out.
// authorize('customer', 'provider') on the route ensures req.user.role is always one of these two.
const createReview = async (req, res, next) => {
  try {
    const { requirement_id, rating, comment, title } = req.body;
    const authorRole = req.user.role;

    if (!requirement_id || !rating) {
      return res.status(400).json({ message: 'Requirement and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const requirement = await Requirement.findById(requirement_id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

    if (!requirement.hired_provider) {
      return res.status(400).json({ message: 'You can only review a requirement after a provider has been hired on it' });
    }

    const booking = await Booking.findOne({ requirement: requirement_id }).select('id status cancellation');
    if (!booking || !['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        message: 'You can only review a job once the booking has been completed or cancelled',
      });
    }
    // On a cancelled booking, only the side that DIDN'T cancel can leave a review - it's meant to
    // rate/flag whoever backed out, not a normal "how was the job" review (the job never happened).
    if (booking.status === 'cancelled' && booking.cancellation?.cancelled_by_role === authorRole) {
      return res.status(400).json({ message: 'You cancelled this booking, so you cannot review it' });
    }

    if (authorRole === 'customer') {
      if (requirement.customer.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only review your own requirement' });
      }
    } else {
      if (requirement.hired_provider.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only review a customer whose job you were hired for' });
      }
    }

    const existing = await Review.findOne({ requirement: requirement_id, author_role: authorRole });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this requirement' });
    }

    const review = await Review.create({
      requirement: requirement_id,
      customer: requirement.customer,
      provider: requirement.hired_provider,
      author_role: authorRole,
      rating,
      title: title || null,
      comment,
    });

    if (authorRole === 'customer') {
      await applyProviderRatingDelta(requirement.hired_provider, rating, { countsAsJob: booking.status === 'completed' });
      await addToPortfolio({ requirement, review });

      emitToUser(requirement.hired_provider, 'notification', {
        title: 'New review',
        message: `You received a ${rating}-star review`,
      });
    } else {
      await applyCustomerRatingDelta(requirement.customer, rating, { countsAsJob: booking.status === 'completed' });

      emitToUser(requirement.customer, 'notification', {
        title: 'New review from your provider',
        message: `You received a ${rating}-star review`,
      });
    }

    res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    next(error);
  }
};

// Reviews ABOUT a provider (written by the customers who hired them) — this is what
// shows up publicly on a provider's profile, so it stays scoped to author_role: 'customer'.
const getProviderReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId, author_role: 'customer' })
      .populate({ path: 'customer', select: 'id name' })
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

// Reviews ABOUT a customer (written by providers they hired). Not public — only the
// customer themselves, or an admin/staff, can view them. Pass 'me' as :customerId to
// fetch your own.
const getCustomerReviews = async (req, res, next) => {
  try {
    const customerId = req.params.customerId === 'me' ? req.user.id : req.params.customerId;

    if (customerId !== req.user.id && !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'You cannot view another customer\u2019s reviews' });
    }

    const reviews = await Review.find({ customer: customerId, author_role: 'provider' })
      .populate({ path: 'provider', select: 'id name avatar_url' })
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

const getMyReviewForRequirement = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      requirement: req.params.requirementId,
      author_role: req.user.role,
      ...(req.user.role === 'customer' ? { customer: req.user.id } : { provider: req.user.id }),
    });
    res.json({ review: review || null });
  } catch (error) {
    next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const { rating, comment, title } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const authorId = review.author_role === 'customer' ? review.customer : review.provider;
    if (authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own review' });
    }

    const oldRating = review.rating;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }
    if (comment !== undefined) review.comment = comment;
    if (title !== undefined) review.title = title || null;

    await review.save();

    if (rating !== undefined && rating !== oldRating) {
      if (review.author_role === 'customer') {
        const profile = await ProviderProfile.findOne({ user: review.provider });
        if (profile && profile.total_reviews > 0) {
          const newAvg = (profile.avg_rating * profile.total_reviews - oldRating + Number(rating)) / profile.total_reviews;
          profile.avg_rating = Math.round(newAvg * 10) / 10;
          await profile.save();
        }
      } else {
        const user = await User.findById(review.customer);
        if (user && user.customer_rating_count > 0) {
          const newAvg =
            (user.customer_rating_avg * user.customer_rating_count - oldRating + Number(rating)) / user.customer_rating_count;
          user.customer_rating_avg = Math.round(newAvg * 10) / 10;
          await user.save();
        }
      }
    }

    res.json({ message: 'Review updated', review });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getProviderReviews,
  getCustomerReviews,
  getMyReviewForRequirement,
  updateReview,
};