const DEFAULT_VIEW_RADIUS_KM = 5;
const MAX_VIEW_RADIUS_KM = 200;

/**
 * Works out how far (in km) a customer wants to see providers/services from
 * their current location.
 * Priority: an explicit ?radius= query param > the logged-in user's saved
 * `requirement_radius_km` preference > the platform default.
 */
const resolveViewerRadiusKm = (radiusParam, reqUser) => {
  if (radiusParam !== undefined && radiusParam !== null && radiusParam !== '') {
    const parsed = Number(radiusParam);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, MAX_VIEW_RADIUS_KM);
    }
  }
  if (reqUser && typeof reqUser.requirement_radius_km === 'number') {
    return Math.min(reqUser.requirement_radius_km, MAX_VIEW_RADIUS_KM);
  }
  return DEFAULT_VIEW_RADIUS_KM;
};

/** Reads ?lat=&lng= off a request's query string. Returns null when either is missing/invalid. */
const parseViewerCoords = (query = {}) => {
  const { lat, lng } = query;
  const hasLocation = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
  if (!hasLocation) return null;

  const viewerLat = Number(lat);
  const viewerLng = Number(lng);
  if (Number.isNaN(viewerLat) || Number.isNaN(viewerLng)) return null;

  return { lat: viewerLat, lng: viewerLng };
};

/** Strips mongo-internal fields off a $geoNear aggregation result so it matches a normal toJSON() document. */
const serializeGeoDoc = (doc) => {
  const plain = JSON.parse(JSON.stringify(doc));
  plain.id = plain._id;
  delete plain._id;
  delete plain.__v;
  if (plain.location) delete plain.location.geo;

  if (plain.user && typeof plain.user === 'object') {
    plain.user.id = plain.user._id;
    delete plain.user._id;
    delete plain.user.__v;
  }

  if (Array.isArray(plain.categories)) {
    plain.categories = plain.categories.map((c) => {
      if (c && typeof c === 'object') {
        c.id = c._id;
        delete c._id;
        delete c.__v;
      }
      return c;
    });
  }

  return plain;
};

module.exports = {
  DEFAULT_VIEW_RADIUS_KM,
  MAX_VIEW_RADIUS_KM,
  resolveViewerRadiusKm,
  parseViewerCoords,
  serializeGeoDoc,
};
