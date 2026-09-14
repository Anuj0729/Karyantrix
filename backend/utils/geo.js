const DEFAULT_VIEW_RADIUS_KM = 5;
const MAX_VIEW_RADIUS_KM = 200;

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


const parseViewerCoords = (query = {}) => {
  const { lat, lng } = query;
  const hasLocation = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
  if (!hasLocation) return null;

  const viewerLat = Number(lat);
  const viewerLng = Number(lng);
  if (Number.isNaN(viewerLat) || Number.isNaN(viewerLng)) return null;

  return { lat: viewerLat, lng: viewerLng };
};


const serializeGeoDoc = (doc) => {
  const plain = JSON.parse(JSON.stringify(doc));
  if (plain._id) {
    plain.id = plain._id;
    delete plain._id;
  }
  delete plain.__v;
  if (plain.location) delete plain.location.geo;

  if (plain.user && typeof plain.user === 'object') {
    if (plain.user._id) {
      plain.user.id = plain.user._id;
      delete plain.user._id;
    }
    delete plain.user.__v;
  }

  if (Array.isArray(plain.categories)) {
    plain.categories = plain.categories.map((c) => {
      if (c && typeof c === 'object') {
        if (c._id) {
          c.id = c._id;
          delete c._id;
        }
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
