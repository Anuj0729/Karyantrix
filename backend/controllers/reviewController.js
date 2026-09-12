const { Review, Requirement, ProviderProfile, Booking } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');

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

const createReview = async (req, res, next) => {
  try {
    const { requirement_id, rating, comment, title } = req.body;

    if (!requirement_id || !rating) {
      return res.status(400).json({ message: 'Requirement and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const requirement = await Requirement.findById(requirement_id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only review your own requirement' });
    }
    if (requirement.status !== 'closed' || !requirement.hired_provider) {
      return res.status(400).json({ message: 'You can only review a requirement after you have hired a provider on it' });
    }

    const existing = await Review.findOne({ requirement: requirement_id });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this requirement' });
    }

    const review = await Review.create({
      requirement: requirement_id,
      customer: req.user.id,
      provider: requirement.hired_provider,
      rating,
      title: title || null,
      comment,
    });

    const profile = await ProviderProfile.findOne({ user: requirement.hired_provider });
    if (profile) {
      const newTotal = profile.total_reviews + 1;
      const newAvg = (profile.avg_rating * profile.total_reviews + Number(rating)) / newTotal;
      profile.total_reviews = newTotal;
      profile.avg_rating = Math.round(newAvg * 10) / 10;
      profile.total_jobs_completed = profile.total_jobs_completed + 1;
      await profile.save();
    }

    await addToPortfolio({ requirement, review });

    emitToUser(requirement.hired_provider, 'notification', {
      title: 'New review',
      message: `You received a ${rating}-star review`,
    });

    res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    next(error);
  }
};

const getProviderReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate({ path: 'customer', select: 'id name' })
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
      customer: req.user.id,
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
    if (review.customer.toString() !== req.user.id) {
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
      const profile = await ProviderProfile.findOne({ user: review.provider });
      if (profile && profile.total_reviews > 0) {
        const newAvg = (profile.avg_rating * profile.total_reviews - oldRating + Number(rating)) / profile.total_reviews;
        profile.avg_rating = Math.round(newAvg * 10) / 10;
        await profile.save();
      }
    }

    res.json({ message: 'Review updated', review });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getProviderReviews, getMyReviewForRequirement, updateReview };
