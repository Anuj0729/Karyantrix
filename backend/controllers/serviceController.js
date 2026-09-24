const { Service, Category, ServiceCatalog } = require('../models');
const { resolveViewerRadiusKm, parseViewerCoords } = require('../utils/geo');
const { ADMIN_ROLES } = require('../utils/roles');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 24;

const getServices = async (req, res, next) => {
  try {
    const { category, catalog_service, minPrice, maxPrice, sort, search, radius } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));

    const where = { is_active: true };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.$gte = Number(minPrice);
      if (maxPrice) where.price.$lte = Number(maxPrice);
    }
    if (search) {
      where.title = { $regex: search, $options: 'i' };
    }
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category }).select('_id').lean();
      if (!categoryDoc) return res.json({ services: [], count: 0, total: 0, page, pages: 0 });
      where.category = categoryDoc._id;
    }
    if (catalog_service) {
      where.catalog_service = catalog_service;
    }

    const { ProviderProfile, User } = require('../models');

    const approvedProviderIds = (
      await ProviderProfile.find({ is_approved: true }).select('user').lean()
    ).map((p) => p.user);
    const activeApprovedProviderIds = (
      await User.find({ _id: { $in: approvedProviderIds }, is_active: true, account_status: 'active' })
        .select('_id')
        .lean()
    ).map((u) => u._id);
    where.provider = { $in: activeApprovedProviderIds };

    let radiusKm = null;
    const viewerCoords = parseViewerCoords(req.query);
    if (viewerCoords) {
      radiusKm = resolveViewerRadiusKm(radius, req.user);
      const nearbyProfiles = await ProviderProfile.find({
        is_approved: true,
        user: { $in: activeApprovedProviderIds },
        'location.geo': {
          $near: {
            $geometry: { type: 'Point', coordinates: [viewerCoords.lng, viewerCoords.lat] },
            $maxDistance: radiusKm * 1000,
          },
        },
      }).select('user');
      where.provider = { $in: nearbyProfiles.map((p) => p.user) };
    }

    const sortMap = {
      price_low: { price: 1 },
      price_high: { price: -1 },
    };

    const [services, total] = await Promise.all([
      Service.find(where)
        .populate({ path: 'category', select: 'id name slug' })
        .populate({ path: 'provider', select: 'id name avatar_url' })
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Service.countDocuments(where),
    ]);

    const providerIds = services.map((s) => s.provider?._id).filter(Boolean);
    const profiles = await ProviderProfile.find({ user: { $in: providerIds } });
    const profileByUserId = new Map(profiles.map((p) => [p.user.toString(), p]));

    let result = services.map((s) => {
      const obj = s.toJSON();
      if (obj.provider) {
        obj.provider.providerProfile = profileByUserId.get(obj.provider.id) || null;
      }
      return obj;
    });

    if (sort === 'rating') {
      result = result.sort(
        (a, b) => (b.provider?.providerProfile?.avg_rating || 0) - (a.provider?.providerProfile?.avg_rating || 0)
      );
    }

    res.json({ services: result, count: result.length, total, page, pages: Math.ceil(total / limit), radius_km: radiusKm });
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const { ProviderProfile, User } = require('../models');
    const service = await Service.findById(req.params.id)
      .populate('category')
      .populate({ path: 'provider', select: 'id name phone avatar_url' });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const [providerProfile, providerUser] = await Promise.all([
      ProviderProfile.findOne({ user: service.provider?.id }),
      User.findById(service.provider?.id).select('is_active account_status'),
    ]);

    const isViewingAdmin = Boolean(req.user) && ADMIN_ROLES.includes(req.user.role);
    const isViewingOwner = Boolean(req.user) && String(req.user.id) === String(service.provider?.id);
    const isProviderVisible = providerUser?.is_active && providerUser?.account_status === 'active';
    if ((!providerProfile?.is_approved || !isProviderVisible) && !isViewingAdmin && !isViewingOwner) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const obj = service.toJSON();
    if (obj.provider) {
      obj.provider.providerProfile = providerProfile;
    }
    res.json({ service: obj });
  } catch (error) {
    next(error);
  }
};

const getMyServices = async (req, res, next) => {
  try {
    const services = await Service.find({ provider: req.user.id })
      .populate('category')
      .sort({ createdAt: -1 });
    res.json({ services });
  } catch (error) {
    next(error);
  }
};

const buildServiceFromCatalog = async (providerId, item) => {
  const { catalog_service_id, price, price_type, duration_minutes, description, images, tags, location } = item;

  if (!catalog_service_id || price === undefined || price === null || price === '') {
    throw { status: 400, message: 'A service and a price are required' };
  }

  const catalogEntry = await ServiceCatalog.findOne({ _id: catalog_service_id, is_active: true });
  if (!catalogEntry) {
    throw { status: 404, message: 'That service is not available - please pick from the list' };
  }

  const existing = await Service.findOne({ provider: providerId, catalog_service: catalogEntry.id, is_active: true });
  if (existing) {
    throw { status: 409, message: `You already have a listing for "${catalogEntry.name}"` };
  }

  return Service.create({
    provider: providerId,
    category: catalogEntry.category,
    catalog_service: catalogEntry.id,
    title: catalogEntry.name,
    description: description || catalogEntry.description || null,
    price,
    price_type: price_type || 'fixed',
    duration_minutes: duration_minutes || 60,
    images: images || [],
    tags: tags || [],
    location: location || null,
  });
};

const MAX_APPLICANT_SERVICES = 1;

const ensureApplicantServiceLimit = async (providerId, role, additionalCount) => {
  if (role !== 'customer') return;
  const existingCount = await Service.countDocuments({ provider: providerId, is_active: true });
  if (existingCount + additionalCount > MAX_APPLICANT_SERVICES) {
    throw {
      status: 400,
      message: 'You can only add one service to your provider application. Remove the existing one first if you want to choose a different category or service.',
    };
  }
};

const createService = async (req, res, next) => {
  try {
    await ensureApplicantServiceLimit(req.user.id, req.user.role, 1);
    const service = await buildServiceFromCatalog(req.user.id, req.body);
    res.status(201).json({ message: 'Service listing created', service });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

const bulkCreateServices = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Select at least one service' });
    }

    await ensureApplicantServiceLimit(req.user.id, req.user.role, items.length);

    const created = [];
    const failed = [];
    for (const item of items) {
      try {
        const service = await buildServiceFromCatalog(req.user.id, item);
        created.push(service);
      } catch (error) {
        failed.push({ catalog_service_id: item.catalog_service_id, message: error.message || 'Could not add this service' });
      }
    }

    res.status(created.length > 0 ? 201 : 400).json({
      message: `${created.length} service listing(s) created${failed.length ? `, ${failed.length} skipped` : ''}`,
      services: created,
      failed,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (service.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own service listings' });
    }

    const { description, price, price_type, duration_minutes, is_active, images, tags, location } = req.body;
    if (description !== undefined) service.description = description;
    if (price !== undefined) service.price = price;
    if (price_type !== undefined) service.price_type = price_type;
    if (duration_minutes !== undefined) service.duration_minutes = duration_minutes;
    if (is_active !== undefined) {
      if (is_active) {
        const [category, catalogEntry] = await Promise.all([
          Category.findById(service.category).select('is_active'),
          ServiceCatalog.findById(service.catalog_service).select('is_active'),
        ]);
        if (!category || !category.is_active) {
          return res.status(400).json({ message: 'This listing is under a category that is currently deactivated' });
        }
        if (!catalogEntry || !catalogEntry.is_active) {
          return res.status(400).json({ message: 'This service has been deactivated in the catalog by an admin' });
        }
      }
      service.is_active = is_active;
      service.deactivated_by_category = false;
      service.deactivated_by_catalog_service = false;
    }
    if (images !== undefined) service.images = images;
    if (tags !== undefined) service.tags = tags;
    if (location !== undefined) service.location = location;
    await service.save();

    res.json({ message: 'Service updated', service });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (service.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only remove your own service listings' });
    }
    service.is_active = false;
    service.deactivated_by_category = false;
    await service.save();
    res.json({ message: 'Service listing removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getServices, getServiceById, getMyServices, createService, bulkCreateServices, updateService, deleteService };
