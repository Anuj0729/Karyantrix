const mongoose = require('mongoose');
const { Requirement, Notification, ProviderProfile, Category, UploadSession, Bid, User, Review, Booking } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');
const { canProviderViewRequirement } = require('../utils/requirementAccess');
const { isAdminRole } = require('../utils/roles');

const serializeAggregateDoc = (obj) => {
  const plain = JSON.parse(JSON.stringify(obj));
  plain.id = plain._id;
  delete plain._id;
  delete plain.__v;
  if (plain.location) delete plain.location.geo;
  return plain;
};

const EXPERIENCE_LEVELS = ['any', 'beginner', 'intermediate', 'expert'];
const POST_TYPES = ['bids', 'fixed'];
const DEFAULT_NOTIFY_RADIUS_KM = 25;
const DEFAULT_VIEW_RADIUS_KM = 5;
const MAX_SERVICE_RADIUS_KM = 200;
const MAX_MEDIA_ITEMS = 5;

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const notify = async (userId, title, message, extra = {}) => {
  const notification = await Notification.create({ user: userId, title, message, type: 'requirement', ...extra });
  emitToUser(userId, 'notification', notification);
  return notification;
};

const toArray = (val) => {
  if (val === undefined || val === null || val === '') return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.map((v) => String(v).trim()).filter(Boolean);
};

const resolveCategoriesForServices = async (serviceNames) => {
  if (serviceNames.length === 0) return [];
  const regexes = serviceNames.map((s) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
  const categories = await Category.find({ name: { $in: regexes } }).select('_id');
  return categories.map((c) => c._id);
};

const notifyNearbyProviders = async (requirement) => {
  if (!requirement.categories || requirement.categories.length === 0) return;

  const baseMatch = { is_approved: true, categories: { $in: requirement.categories } };

  const [nearby, noLocation] = await Promise.all([
    ProviderProfile.find({
      ...baseMatch,
      'location.geo': {
        $near: {
          $geometry: { type: 'Point', coordinates: [requirement.location.lng, requirement.location.lat] },
          $maxDistance: MAX_SERVICE_RADIUS_KM * 1000,
        },
      },
    }).select('user location service_radius_km'),
    ProviderProfile.find({
      ...baseMatch,
      $or: [{ 'location.lat': null }, { 'location.lat': { $exists: false } }],
    }).select('user location service_radius_km'),
  ]);

  const matches = [
    ...nearby.filter((profile) => {
      const radius = profile.service_radius_km || DEFAULT_NOTIFY_RADIUS_KM;
      const dist = distanceKm(requirement.location.lat, requirement.location.lng, profile.location.lat, profile.location.lng);
      return dist <= radius;
    }),
    ...noLocation,
  ];

  const serviceLabel = requirement.services.join(', ');
  const requirementJson = requirement.toJSON();
  await Promise.all(
    matches.map((profile) => {
      emitToUser(profile.user, 'requirement:new', requirementJson);
      return notify(
        profile.user,
        'New job near you',
        `A new "${serviceLabel}" requirement was posted near ${requirement.location.text}`,
        { related_requirement: requirement._id }
      );
    })
  );
};

const notifyEngagedProviders = async (requirement, changedFields) => {
  if (!changedFields || changedFields.length === 0) return;

  const bidProviderIds = await Bid.find({ requirement: requirement.id }).distinct('provider');
  const interestedProviderIds = requirement.interested_providers.map((p) => p.provider);
  const targetedProviderIds = requirement.target_provider ? [requirement.target_provider] : [];

  const providerIds = Array.from(
    new Set([...bidProviderIds, ...interestedProviderIds, ...targetedProviderIds].map((id) => id.toString()))
  );
  if (providerIds.length === 0) return;

  const serviceLabel = requirement.services.join(', ');
  const changeSummary = changedFields.join(', ');
  const requirementJson = requirement.toJSON();

  await Promise.all(
    providerIds.map((providerId) => {
      emitToUser(providerId, 'requirement:updated', requirementJson);
      return notify(
        providerId,
        'Requirement updated',
        `The "${serviceLabel}" requirement you're engaged with was updated (${changeSummary}).`,
        { related_requirement: requirement._id }
      );
    })
  );
};

const resolveMediaFromSessions = async (mediaIds, customerId) => {
  if (!mediaIds || mediaIds.length === 0) return [];

  const sessions = await UploadSession.find({ _id: { $in: mediaIds } });

  const byId = new Map(sessions.map((s) => [s.id, s]));
  const missing = mediaIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw Object.assign(new Error(`Unknown media_id(s): ${missing.join(', ')}`), { status: 400 });
  }

  const media = mediaIds.map((id) => {
    const session = byId.get(id);
    if (session.uploader.toString() !== customerId) {
      throw Object.assign(new Error('One or more uploaded files do not belong to you'), { status: 403 });
    }
    if (session.status !== 'completed') {
      throw Object.assign(new Error(`Upload ${id} has not finished uploading yet`), { status: 400 });
    }
    if (session.consumed) {
      throw Object.assign(new Error(`Upload ${id} has already been attached to another post`), { status: 400 });
    }
    return { url: session.url, type: session.media_type, session };
  });

  return media;
};

const createRequirement = async (req, res, next) => {
  try {
    const services = toArray(req.body.services ?? req.body.service);
    const experienceLevels = toArray(req.body.experience_levels ?? req.body.experience_required);
    const mediaIds = toArray(req.body.media_ids);
    const { description, location_text, lat, lng, budget, target_provider_id } = req.body;

    if (services.length === 0 || !description) {
      return res.status(400).json({ message: 'At least one service and a description are required' });
    }
    if (!location_text || lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Location is required' });
    }
    if (budget === undefined || budget === null || budget === '') {
      return res.status(400).json({ message: 'Please define a budget for this requirement' });
    }
    const budgetNum = Number(budget);
    if (Number.isNaN(budgetNum) || budgetNum < 0) {
      return res.status(400).json({ message: 'Budget must be a valid non-negative number' });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }
    const invalidLevel = experienceLevels.find((lvl) => !EXPERIENCE_LEVELS.includes(lvl));
    if (invalidLevel) {
      return res.status(400).json({ message: `Invalid experience level: ${invalidLevel}` });
    }

    const postType = req.body.post_type || 'bids';
    if (!POST_TYPES.includes(postType)) {
      return res.status(400).json({ message: `Invalid post type: ${postType}` });
    }

    let targetProvider = null;
    if (target_provider_id) {
      const targetUser = await User.findById(target_provider_id).select('id role is_active');
      if (!targetUser || targetUser.role !== 'provider' || !targetUser.is_active) {
        return res.status(400).json({ message: 'The provider you are trying to book is not available' });
      }
      targetProvider = targetUser.id;
    }

    let resolvedMedia;
    try {
      resolvedMedia = await resolveMediaFromSessions(mediaIds, req.user.id);
    } catch (mediaError) {
      return res.status(mediaError.status || 400).json({ message: mediaError.message });
    }

    const categoryIds = toArray(req.body.category_ids);
    const categories = categoryIds.length > 0 ? categoryIds : await resolveCategoriesForServices(services);

    const requirement = await Requirement.create({
      customer: req.user.id,
      services,
      categories,
      description,
      budget: budgetNum,
      experience_levels: experienceLevels.length > 0 ? experienceLevels : ['any'],
      media: resolvedMedia.map(({ url, type }) => ({ url, type })),
      location: { text: location_text, lat: latNum, lng: lngNum },
      post_type: postType,
      target_provider: targetProvider,
    });

    await UploadSession.updateMany(
      { _id: { $in: resolvedMedia.map((m) => m.session.id) } },
      { $set: { consumed: true } }
    );

    const populated = await requirement.populate([
      { path: 'customer', select: 'id name avatar_url is_verified' },
      { path: 'categories', select: 'id name slug' },
    ]);

    if (targetProvider) {
      notify(
        targetProvider,
        'New booking request',
        `${req.user.name} wants to book you for "${services.join(', ')}"`,
        { related_requirement: requirement.id }
      ).catch((err) => undefined);
    } else {
      notifyNearbyProviders(requirement).catch((err) => undefined);
    }

    res.status(201).json({ message: 'Requirement posted', requirement: populated });
  } catch (error) {
    next(error);
  }
};

const getRequirementById = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id)
      .populate({
        path: 'customer',
        select:
          'id name avatar_url is_verified createdAt customer_rating_avg customer_rating_count customer_jobs_completed',
      })
      .populate({ path: 'categories', select: 'id name slug' });
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

    const viewerRole = req.user?.role;
    const viewerId = req.user?.id ? String(req.user.id) : null;
    const isOwner = viewerRole === 'customer' && String(requirement.customer.id) === viewerId;
    const isAdmin = isAdminRole(viewerRole);

    // A booking request targeted at one specific provider stays private to that provider,
    // the customer who sent it, and admins - mirrors the visibility rules in getFeed().
    if (requirement.target_provider && !isAdmin && !isOwner) {
      const isTargetedProvider = viewerRole === 'provider' && String(requirement.target_provider) === viewerId;
      if (!isTargetedProvider) {
        return res.status(404).json({ message: 'Requirement not found' });
      }
    }

    if (viewerRole === 'provider' && !isAdmin) {
      const allowed = await canProviderViewRequirement(requirement, viewerId);
      if (!allowed) {
        return res.status(403).json({ message: 'This requirement is not available to you' });
      }
    }

    const json = requirement.toJSON();

    // Jobs done by this customer: same review-driven counter used for providers
    // (bumped in reviewController once a provider reviews them after their booking is
    // actually completed), shown on the client profile panel alongside their rating.
    if (json.customer) {
      json.customer.jobs_done = json.customer.customer_jobs_completed || 0;
    }

    const { lat, lng } = req.query;
    const hasQueryLocation = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
    if (hasQueryLocation && typeof requirement.location?.lat === 'number' && typeof requirement.location?.lng === 'number') {
      const viewerLat = Number(lat);
      const viewerLng = Number(lng);
      if (!Number.isNaN(viewerLat) && !Number.isNaN(viewerLng)) {
        json.distance_km =
          Math.round(distanceKm(viewerLat, viewerLng, requirement.location.lat, requirement.location.lng) * 10) / 10;
      }
    }

    json.is_owner = isOwner;

    // Whether the interest list belongs to the viewer's own "I'm interested" taps, and whether they've
    // already tapped it - lets the button stay disabled after a refresh instead of only after a click.
    json.interested_count = Array.isArray(json.interested_providers) ? json.interested_providers.length : 0;
    if (viewerRole === 'provider' && !isAdmin) {
      json.i_am_interested = requirement.interested_providers.some((i) => String(i.provider) === viewerId);
    }
    // The raw interested_providers subdocuments (provider ids + private messages) are only meant for
    // the owner and admins - everyone else gets the count above via the dedicated /interested endpoint,
    // which applies its own per-viewer rules (message hidden from other providers, etc).
    if (!isOwner && !isAdmin) {
      delete json.interested_providers;
    }

    res.json({ requirement: json });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Requirement not found' });
    }
    next(error);
  }
};

const getFeed = async (req, res, next) => {
  try {
    const { lat, lng, limit = 20, page = 1 } = req.query;
    const hasLocation = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
    let viewerLat = hasLocation ? Number(lat) : null;
    let viewerLng = hasLocation ? Number(lng) : null;
    let hasValidLocation = hasLocation && !Number.isNaN(viewerLat) && !Number.isNaN(viewerLng);

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const isAdmin = isAdminRole(req.user?.role);
    const viewerObjectId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;

    let viewerRadiusKm = DEFAULT_VIEW_RADIUS_KM;
    if (req.user) {
      if (isAdminRole(req.user.role)) {
        viewerRadiusKm = null;
      } else if (req.user.role === 'provider') {
        const providerProfile = await ProviderProfile.findOne({ user: req.user.id }).select('service_radius_km location');
        viewerRadiusKm = providerProfile?.service_radius_km ?? DEFAULT_VIEW_RADIUS_KM;

        if (typeof providerProfile?.location?.lat === 'number' && typeof providerProfile?.location?.lng === 'number') {
          viewerLat = providerProfile.location.lat;
          viewerLng = providerProfile.location.lng;
          hasValidLocation = true;
        } else {
          hasValidLocation = false;
        }
      } else {
        const viewerUser = await User.findById(req.user.id).select('requirement_radius_km');
        viewerRadiusKm = viewerUser?.requirement_radius_km ?? DEFAULT_VIEW_RADIUS_KM;
      }
    }

    let targetedRequirements = [];
    if (viewerObjectId && !isAdmin) {
      const targetedRows = await Requirement.find({
        status: 'open',
        $or: [{ target_provider: viewerObjectId }, { customer: viewerObjectId, target_provider: { $ne: null } }],
      })
        .populate({ path: 'customer', select: 'id name avatar_url is_verified' })
        .populate({ path: 'categories', select: 'id name slug' })
        .sort({ createdAt: -1 });
      targetedRequirements = targetedRows.map((r) => r.toJSON());
    }
    const targetedIds = new Set(targetedRequirements.map((r) => r.id));

    const visibility = isAdmin ? {} : { target_provider: null };

    const skip = (pageNum - 1) * limitNum;
    const totalTargeted = targetedRequirements.length;
    const skipInTargeted = Math.min(skip, totalTargeted);
    const remainingSkip = skip - skipInTargeted;
    const targetedSlice = targetedRequirements.slice(skipInTargeted, skipInTargeted + limitNum);
    const remainingLimit = limitNum - targetedSlice.length;

    let generalRequirements = [];
    let totalGeneral;

    if (hasValidLocation && viewerRadiusKm) {
      const geoNearStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [viewerLng, viewerLat] },
          distanceField: 'distance_m',
          maxDistance: viewerRadiusKm * 1000,
          spherical: true,
          query: { status: 'open', ...visibility },
        },
      };

      const [rows, countResult] = await Promise.all([
        remainingLimit > 0
          ? Requirement.aggregate([geoNearStage, { $skip: remainingSkip }, { $limit: remainingLimit }])
          : Promise.resolve([]),
        Requirement.aggregate([geoNearStage, { $count: 'total' }]),
      ]);

      const populated = await Requirement.populate(rows, [
        { path: 'customer', select: 'id name avatar_url is_verified' },
        { path: 'categories', select: 'id name slug' },
      ]);

      generalRequirements = populated.map((r) => {
        const json = serializeAggregateDoc(r);
        json.distance_km = Math.round((r.distance_m / 1000) * 10) / 10;
        delete json.distance_m;
        return json;
      });
      totalGeneral = countResult[0]?.total || 0;
    } else {
      const filter = { status: 'open', ...visibility };
      const [rows, count] = await Promise.all([
        remainingLimit > 0
          ? Requirement.find(filter)
              .populate({ path: 'customer', select: 'id name avatar_url is_verified' })
              .populate({ path: 'categories', select: 'id name slug' })
              .sort({ createdAt: -1 })
              .skip(remainingSkip)
              .limit(remainingLimit)
          : Promise.resolve([]),
        Requirement.countDocuments(filter),
      ]);
      generalRequirements = rows.map((r) => r.toJSON());
      totalGeneral = count;
    }

    const requirements = [...targetedSlice, ...generalRequirements.filter((r) => !targetedIds.has(r.id))];
    const total = totalTargeted + totalGeneral;

    res.json({ requirements, total, page: pageNum, limit: limitNum, radius_km: viewerRadiusKm });
  } catch (error) {
    next(error);
  }
};

const getMyRequirements = async (req, res, next) => {
  try {
    const requirements = await Requirement.find({ customer: req.user.id })
      .populate({ path: 'customer', select: 'id name avatar_url is_verified' })
      .populate({ path: 'interested_providers.provider', select: 'id name avatar_url' })
      .populate({ path: 'categories', select: 'id name slug' })
      .sort({ createdAt: -1 });
    res.json({ requirements });
  } catch (error) {
    next(error);
  }
};

const expressInterest = async (req, res, next) => {
  try {
    const { message } = req.body;
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'This requirement is no longer open' });
    }
    if (requirement.target_provider && requirement.target_provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This booking request was sent to a different provider' });
    }

    const already = requirement.interested_providers.some((i) => i.provider.toString() === req.user.id);
    if (already) {
      return res.status(409).json({ message: 'You have already expressed interest in this requirement' });
    }

    requirement.interested_providers.push({ provider: req.user.id, message: message || null });
    await requirement.save();

    await notify(
      requirement.customer,
      'A provider is interested',
      `${req.user.name} is interested in your "${requirement.services.join(', ')}" requirement`,
      { related_requirement: requirement._id }
    );

    emitToUser(requirement.customer, 'requirement_interest', {
      requirement_id: requirement.id,
      interest: {
        provider: { id: req.user.id, name: req.user.name, avatar_url: req.user.avatar_url },
        message: message || null,
        created_at: new Date(),
      },
    });

    res.json({ message: 'Interest sent to the customer' });
  } catch (error) {
    next(error);
  }
};

const getInterestedProviders = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id).populate({
      path: 'interested_providers.provider',
      select: 'id name avatar_url',
    });
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

    const isOwner = requirement.customer.toString() === req.user.id;

    // Not the owner: only providers who could see this post at all get to see who else is
    // interested in it (same rule bid-visible providers get on "bids" posts), and they only
    // get the list itself - no one's private message to the customer, no hiring.
    if (!isOwner) {
      if (req.user.role !== 'provider' || !(await canProviderViewRequirement(requirement, req.user.id))) {
        return res.status(403).json({ message: 'This requirement is not available to you' });
      }
    }

    const review = isOwner && requirement.status === 'closed' ? await Review.findOne({ requirement: requirement.id }) : null;
    const booking =
      isOwner && requirement.status === 'closed'
        ? await Booking.findOne({ requirement: requirement.id }).select('id status')
        : null;

    const interestedProviders = isOwner
      ? requirement.interested_providers
      : requirement.interested_providers.map((entry) => ({
          provider: entry.provider,
          created_at: entry.created_at,
          is_mine: String(entry.provider?.id || entry.provider) === String(req.user.id),
        }));

    res.json({
      requirement_id: requirement.id,
      requirement_status: requirement.status,
      hired_provider: requirement.hired_provider,
      viewer_role: isOwner ? 'customer' : 'provider',
      reviewed: !!review,
      review,
      booking_status: booking ? booking.status : null,
      interested_providers: interestedProviders,
    });
  } catch (error) {
    next(error);
  }
};

const closeRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only close your own requirement' });
    }
    requirement.status = 'closed';
    await requirement.save();
    res.json({ message: 'Requirement closed', requirement });
  } catch (error) {
    next(error);
  }
};

const updateRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own requirement' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'This requirement can no longer be edited - a provider has already been hired' });
    }

    // Snapshot the pre-edit values so we can tell engaged providers exactly what changed.
    const original = {
      description: requirement.description,
      budget: requirement.budget,
      services: [...requirement.services],
      location: { text: requirement.location.text, lat: requirement.location.lat, lng: requirement.location.lng },
      media: requirement.media.map((m) => m.url),
      post_type: requirement.post_type,
      experience_levels: [...requirement.experience_levels],
    };

    const { description, location_text, lat, lng, budget } = req.body;
    const servicesProvided = req.body.services !== undefined || req.body.service !== undefined;
    const experienceProvided = req.body.experience_levels !== undefined || req.body.experience_required !== undefined;
    const mediaProvided = req.body.media_ids !== undefined || req.body.existing_media !== undefined;

    if (servicesProvided) {
      const services = toArray(req.body.services ?? req.body.service);
      if (services.length === 0) {
        return res.status(400).json({ message: 'At least one service is required' });
      }
      requirement.services = services;

      const categoryIds = toArray(req.body.category_ids);
      requirement.categories = categoryIds.length > 0 ? categoryIds : await resolveCategoriesForServices(services);
    } else if (req.body.category_ids !== undefined) {
      requirement.categories = toArray(req.body.category_ids);
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ message: 'Description cannot be empty' });
      }
      requirement.description = description;
    }

    if (budget !== undefined && budget !== null && budget !== '') {
      const budgetNum = Number(budget);
      if (Number.isNaN(budgetNum) || budgetNum < 0) {
        return res.status(400).json({ message: 'Budget must be a valid non-negative number' });
      }
      requirement.budget = budgetNum;
    }

    if (experienceProvided) {
      const experienceLevels = toArray(req.body.experience_levels ?? req.body.experience_required);
      const invalidLevel = experienceLevels.find((lvl) => !EXPERIENCE_LEVELS.includes(lvl));
      if (invalidLevel) {
        return res.status(400).json({ message: `Invalid experience level: ${invalidLevel}` });
      }
      requirement.experience_levels = experienceLevels.length > 0 ? experienceLevels : ['any'];
    }

    if (req.body.post_type !== undefined) {
      if (!POST_TYPES.includes(req.body.post_type)) {
        return res.status(400).json({ message: `Invalid post type: ${req.body.post_type}` });
      }
      if (requirement.post_type !== req.body.post_type) {
        const hasActivity =
          requirement.interested_providers.length > 0 || (await Bid.exists({ requirement: requirement.id }));
        if (hasActivity) {
          return res.status(400).json({
            message: 'Cannot change bid/fixed type once providers have bid or shown interest',
          });
        }
      }
      requirement.post_type = req.body.post_type;
    }

    if (location_text !== undefined || lat !== undefined || lng !== undefined) {
      const latNum = lat !== undefined ? Number(lat) : requirement.location.lat;
      const lngNum = lng !== undefined ? Number(lng) : requirement.location.lng;
      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        return res.status(400).json({ message: 'Invalid location coordinates' });
      }
      requirement.location = {
        text: location_text !== undefined ? location_text : requirement.location.text,
        lat: latNum,
        lng: lngNum,
      };
    }

    if (mediaProvided) {
      const mediaIds = toArray(req.body.media_ids);

      // Media the customer chose to keep from the original post. Only media that already belongs to
      // this requirement is honoured - matched by URL - so the request body can't smuggle in arbitrary URLs.
      const existingMediaInput = Array.isArray(req.body.existing_media) ? req.body.existing_media : [];
      const currentMediaByUrl = new Map(requirement.media.map((m) => [m.url, m]));
      const keptMedia = existingMediaInput
        .map((item) => currentMediaByUrl.get(typeof item === 'string' ? item : item?.url))
        .filter(Boolean)
        .map((m) => ({ url: m.url, type: m.type }));

      let resolvedMedia = [];
      if (mediaIds.length > 0) {
        try {
          resolvedMedia = await resolveMediaFromSessions(mediaIds, req.user.id);
        } catch (mediaError) {
          return res.status(mediaError.status || 400).json({ message: mediaError.message });
        }
      }

      requirement.media = [...keptMedia, ...resolvedMedia.map(({ url, type }) => ({ url, type }))].slice(
        0,
        MAX_MEDIA_ITEMS
      );

      if (resolvedMedia.length > 0) {
        await UploadSession.updateMany(
          { _id: { $in: resolvedMedia.map((m) => m.session.id) } },
          { $set: { consumed: true } }
        );
      }
    }

    await requirement.save();

    const populated = await requirement.populate([
      { path: 'customer', select: 'id name avatar_url is_verified' },
      { path: 'categories', select: 'id name slug' },
      { path: 'interested_providers.provider', select: 'id name avatar_url' },
    ]);

    // Work out exactly what changed so engaged providers get a meaningful notification.
    const changedFields = [];
    if (original.description !== requirement.description) changedFields.push('description');
    if (original.budget !== requirement.budget) changedFields.push('budget');
    if (JSON.stringify(original.services) !== JSON.stringify(requirement.services)) changedFields.push('services');
    if (
      original.location.text !== requirement.location.text ||
      original.location.lat !== requirement.location.lat ||
      original.location.lng !== requirement.location.lng
    ) {
      changedFields.push('location');
    }
    if (JSON.stringify(original.media) !== JSON.stringify(requirement.media.map((m) => m.url))) {
      changedFields.push('photos/videos');
    }
    if (original.post_type !== requirement.post_type) changedFields.push('response type');
    if (JSON.stringify(original.experience_levels) !== JSON.stringify(requirement.experience_levels)) {
      changedFields.push('experience level');
    }

    notifyEngagedProviders(requirement, changedFields).catch((err) => undefined);

    res.json({ message: 'Requirement updated', requirement: populated });
  } catch (error) {
    next(error);
  }
};

const deleteRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (requirement.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own requirement' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'This requirement can no longer be deleted - a provider has already been hired' });
    }

    await Bid.deleteMany({ requirement: requirement.id });
    await requirement.deleteOne();

    res.json({ message: 'Requirement deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequirement,
  getRequirementById,
  getFeed,
  getMyRequirements,
  expressInterest,
  getInterestedProviders,
  closeRequirement,
  updateRequirement,
  deleteRequirement,
};