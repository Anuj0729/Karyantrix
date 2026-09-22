const { ProviderProfile } = require('../models');

const hasApprovedProviderProfile = async (userId) =>
  Boolean(
    await ProviderProfile.exists({
      user: userId,
      $or: [{ application_status: 'approved' }, { is_approved: true }],
    })
  );

const canSwitchToProvider = async (user) => {
  if (!user || user.role !== 'customer') return false;
  return hasApprovedProviderProfile(user.id);
};

const publicUser = async (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar_url: user.avatar_url,
  cover_photo_url: user.cover_photo_url,
  can_switch_to_provider: await canSwitchToProvider(user),
});

module.exports = { hasApprovedProviderProfile, canSwitchToProvider, publicUser };
