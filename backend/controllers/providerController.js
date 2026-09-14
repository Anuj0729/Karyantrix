const { ProviderProfile, User, Service, Category, Notification } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');
const { resolveViewerRadiusKm, parseViewerCoords, serializeGeoDoc } = require('../utils/geo');

const REQUIRED_APPLICATION_FIELDS = [
  { key: 'professional_title', label: 'Professional title' },
  { key: 'bio', label: 'Bio / about' },
  { key: 'city', label: 'Location' },
  { key: 'service_area', label: 'Service area' },
  { key: 'experience_years', label: 'Years of experience' },
  { key: 'categories', label: 'Primary category', isArray: true },
  { key: 'skills', label: 'Skills', isArray: true },
  { key: 'languages', label: 'Languages', isArray: true },
  { key: 'service_radius_km', label: 'Service radius' },
];

const isFieldComplete = (profile, field) => {
  const val = profile[field.key];
  if (field.isArray) return Array.isArray(val) && val.length > 0;
  return val !== null && val !== undefined && val !== '';
};

const hasPreciseLocation = (profile) => profile.location && profile.location.lat != null && profile.location.lng != null;

const hasKycDocuments = (profile) =>
  Boolean(profile.kyc_documents?.aadhar_front && profile.kyc_documents?.aadhar_back && profile.kyc_documents?.passbook_front);

const buildApplicationMeta = async (profile) => {
  const missing = REQUIRED_APPLICATION_FIELDS.filter((f) => !isFieldComplete(profile, f)).map((f) => f.label);
  if (!hasPreciseLocation(profile)) missing.push('Precise location');
  if (!hasKycDocuments(profile)) missing.push('KYC documents (Aadhaar front & back, passbook front)');

  const serviceCount = await Service.countDocuments({ provider: profile.user });
  if (serviceCount === 0) missing.push('At least one service');

  const totalChecks = REQUIRED_APPLICATION_FIELDS.length + 3;
  const completed = totalChecks - missing.length;
  const completion_percentage = Math.round((completed / totalChecks) * 100);

  return { missing, completion_percentage, service_count: serviceCount, can_submit: missing.length === 0 };
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id }).populate('categories', 'id name slug');
    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Provider profile not found' });

    const EDITABLE_FIELDS = [
      'bio', 'service_area', 'city', 'experience_years', 'is_available',
      'professional_title', 'categories', 'skills', 'languages', 'certifications',
      'portfolio', 'starting_price', 'starting_price_type', 'response_time_minutes', 'service_radius_km', 'availability',
      'location', 'kyc_documents',
    ];

    if (req.body.service_radius_km !== undefined) {
      const radius = Number(req.body.service_radius_km);
      if (Number.isNaN(radius) || radius < 1 || radius > 200) {
        return res.status(400).json({ message: 'Service radius must be between 1 and 200 km' });
      }
    }

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) profile[field] = req.body[field];
    }
    await profile.save();

    res.json({ message: 'Profile updated', profile });
  } catch (error) {
    next(error);
  }
};

const becomeProvider = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'provider') {
      return res.status(400).json({ message: 'You are already registered as a service provider' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ message: 'This account type cannot apply to become a service provider' });
    }

    let profile = await ProviderProfile.findOneAndUpdate(
      { user: user.id },
      { $setOnInsert: { user: user.id, application_status: 'draft' } },
      { new: true, upsert: true }
    );
    if (profile.application_status === 'rejected' || profile.application_status === 'changes_required') {
      profile.application_status = 'incomplete';
      await profile.save();
    }

    const meta = await buildApplicationMeta(profile);
    res.json({ message: 'Provider application started', profile, ...meta });
  } catch (error) {
    next(error);
  }
};

const getMyApplication = async (req, res, next) => {
  try {
    let profile = await ProviderProfile.findOne({ user: req.user.id }).populate('categories', 'id name slug');
    if (!profile) {
      return res.json({
        profile: null,
        missing: [...REQUIRED_APPLICATION_FIELDS.map((f) => f.label), 'Precise location', 'At least one service'],
        completion_percentage: 0,
        service_count: 0,
        can_submit: false,
      });
    }
    const meta = await buildApplicationMeta(profile);
    res.json({ profile, ...meta });
  } catch (error) {
    next(error);
  }
};

const saveApplicationStep = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'provider') {
      return res.status(400).json({ message: 'You are already an active provider' });
    }

    let profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) profile = new ProviderProfile({ user: req.user.id });

    if (['approved', 'submitted', 'under_review'].includes(profile.application_status)) {
      return res.status(400).json({ message: `Application is already ${profile.application_status.replace('_', ' ')} and can no longer be edited.` });
    }

    const EDITABLE_FIELDS = [
      'professional_title', 'bio', 'city', 'service_area', 'experience_years',
      'categories', 'skills', 'certifications', 'portfolio', 'languages',
      'service_radius_km', 'starting_price', 'starting_price_type', 'availability', 'location', 'kyc_documents',
    ];
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) profile[field] = req.body[field];
    }

    profile.application_status = 'incomplete';
    await profile.save();

    const meta = await buildApplicationMeta(profile);
    res.json({ message: 'Application saved', profile, ...meta });
  } catch (error) {
    next(error);
  }
};

const submitApplication = async (req, res, next) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Start your application first' });

    if (['submitted', 'under_review', 'approved'].includes(profile.application_status)) {
      return res.status(400).json({ message: `Application is already ${profile.application_status.replace('_', ' ')}.` });
    }

    const meta = await buildApplicationMeta(profile);
    if (!meta.can_submit) {
      return res.status(400).json({ message: 'Please complete all required fields before submitting', missing: meta.missing });
    }

    profile.application_status = 'submitted';
    profile.verification_status = 'pending';
    profile.application_feedback = null;
    await profile.save();

    const admins = await User.find({ role: 'admin' }).select('_id');
    const applicant = await User.findById(req.user.id).select('name');
    await Promise.all(
      admins.map(async (admin) => {
        emitToUser(admin.id, 'notification', {
          title: 'New provider application',
          message: `${applicant?.name || 'A customer'} submitted a provider application awaiting your review.`,
        });
        await Notification.create({
          user: admin.id,
          title: 'New provider application',
          message: `${applicant?.name || 'A customer'} submitted a provider application awaiting your review.`,
          type: 'application_status',
        });
      })
    );

    res.json({ message: 'Application submitted for admin review', profile });
  } catch (error) {
    next(error);
  }
};

const AGG_SORT_MAP = {
  rating: { avg_rating: -1 },
  price_low: { starting_price: 1 },
  price_high: { starting_price: -1 },
  most_experienced: { experience_years: -1 },
  most_reviewed: { total_reviews: -1 },
  recent: { createdAt: -1 },
};

const getProviders = async (req, res, next) => {
  try {
    const {
      search, category, location, minPrice, maxPrice, minRating,
      minExperience, availableNow, sort, page = 1, limit = 12, radius,
    } = req.query;

    const match = { is_approved: true };
    if (location) match.city = { $regex: location, $options: 'i' };
    if (minRating) match.avg_rating = { $gte: Number(minRating) };
    if (minExperience) match.experience_years = { $gte: Number(minExperience) };
    if (availableNow === 'true') match.is_available = true;
    if (minPrice || maxPrice) {
      match.starting_price = {};
      if (minPrice) match.starting_price.$gte = Number(minPrice);
      if (maxPrice) match.starting_price.$lte = Number(maxPrice);
    }
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category }).select('_id');
      if (!categoryDoc) return res.json({ providers: [], count: 0, page: Number(page), pages: 0 });
      match.categories = categoryDoc._id;
    }

    const activeUserIds = await User.find({ account_status: 'active' }).select('_id').lean();
    match.user = { $in: activeUserIds.map((u) => u._id) };

    if (search) {
      const re = new RegExp(search, 'i');
      match.$or = [{ professional_title: re }, { skills: re }, { bio: re }];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    const viewerCoords = parseViewerCoords(req.query);
    if (viewerCoords) {
      const viewerRadiusKm = resolveViewerRadiusKm(radius, req.user);

      const geoNearStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [viewerCoords.lng, viewerCoords.lat] },
          distanceField: 'distance_m',
          maxDistance: viewerRadiusKm * 1000,
          spherical: true,
          query: match,
        },
      };

      const pipeline = [geoNearStage];
      if (sort && AGG_SORT_MAP[sort]) pipeline.push({ $sort: AGG_SORT_MAP[sort] });
      pipeline.push({ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum });

      const [rows, countResult] = await Promise.all([
        ProviderProfile.aggregate(pipeline),
        ProviderProfile.aggregate([geoNearStage, { $count: 'total' }]),
      ]);

      const populated = await ProviderProfile.populate(rows, [
        { path: 'user', select: 'id name avatar_url account_status' },
        { path: 'categories', select: 'id name slug' },
      ]);

      const providers = populated.map((p) => {
        const json = serializeGeoDoc(p);
        json.distance_km = Math.round((p.distance_m / 1000) * 10) / 10;
        delete json.distance_m;
        return json;
      });

      const count = countResult[0]?.total || 0;
      return res.json({
        providers, count, page: pageNum, pages: Math.ceil(count / limitNum), radius_km: viewerRadiusKm,
      });
    }

    const sortOption = AGG_SORT_MAP[sort] || { avg_rating: -1, total_reviews: -1 };

    const [count, providers] = await Promise.all([
      ProviderProfile.countDocuments(match),
      ProviderProfile.find(match)
        .populate({ path: 'user', select: 'id name avatar_url account_status' })
        .populate('categories', 'id name slug')
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    res.json({ providers, count, page: pageNum, pages: Math.ceil(count / limitNum) });
  } catch (error) {
    next(error);
  }
};

const getProviderProfile = async (req, res, next) => {
  try {
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' }).select('id name avatar_url location createdAt');
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const [profile, services] = await Promise.all([
      ProviderProfile.findOne({ user: provider.id }).populate('categories', 'id name slug'),
      Service.find({ provider: provider.id, is_active: true }).populate({
        path: 'category',
        select: 'id name slug',
      }),
    ]);

    const result = provider.toJSON();
    result.providerProfile = profile;
    result.services = services;

    res.json({ provider: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  becomeProvider,
  getMyApplication,
  saveApplicationStep,
  submitApplication,
  getProviders,
  getProviderProfile,
};