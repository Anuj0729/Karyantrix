const { Bid, ProviderProfile } = require('../models');

const DEFAULT_VIEW_RADIUS_KM = 5;
const EARTH_RADIUS_KM = 6378.137;

const toRad = (deg) => (deg * Math.PI) / 180;

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

// Whether a provider is allowed to see a requirement. This mirrors the rules getFeed() applies to the
// "Requirements Near You" list, so anyone who can see the post can also see the bids on it.
const canProviderViewRequirement = async (requirement, providerId) => {
  const pid = String(providerId);

  // A booking request sent to one specific provider is visible to that provider only.
  if (requirement.target_provider) return String(requirement.target_provider) === pid;

  // A provider who already bid has seen the post, and can keep following it after it closes.
  if (await Bid.exists({ requirement: requirement.id, provider: pid })) return true;

  if (requirement.status !== 'open') return false;

  const profile = await ProviderProfile.findOne({ user: pid }).select('service_radius_km location');
  const pLat = profile?.location?.lat;
  const pLng = profile?.location?.lng;
  // The feed doesn't geo-filter providers who haven't saved a location yet.
  if (typeof pLat !== 'number' || typeof pLng !== 'number') return true;

  const rLat = requirement.location?.lat;
  const rLng = requirement.location?.lng;
  if (typeof rLat !== 'number' || typeof rLng !== 'number') return false;

  const radiusKm = profile.service_radius_km ?? DEFAULT_VIEW_RADIUS_KM;
  return distanceKm(pLat, pLng, rLat, rLng) <= radiusKm;
};

module.exports = { canProviderViewRequirement, distanceKm };
