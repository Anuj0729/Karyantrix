const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { User, PendingUser, Otp, ProviderProfile } = require('../models');
const { generateAccessToken } = require('../utils/generateToken');
const { issueAuthTokens, clearRefreshCookie } = require('../utils/authCookies');
const jwt = require('jsonwebtoken');

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const { generateOTP, sendOtp } = require('../utils/otp');
const { parseIdentifier } = require('../utils/identifier');
const { saveBuffer, deleteByUrl } = require('../services/storageService');

const OTP_TTL_MS = 5 * 60 * 1000;
const PENDING_TTL_MS = 10 * 60 * 1000;

const { publicUser, canSwitchToProvider } = require('../utils/userPayload');

const findUserByIdentifier = (method, value) => {
  return User.findOne(method === 'email' ? { email: value } : { phone: value });
};

const initiateRegister = async (req, res, next) => {
  try {
    const { name, identifier, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const parsed = parseIdentifier(identifier);
    if (!parsed) {
      return res.status(400).json({ message: 'Please provide a valid email address or phone number' });
    }
    const { method, value } = parsed;

    const existingUser = await findUserByIdentifier(method, value);
    if (existingUser) {
      return res.status(409).json({ message: `An account with this ${method} already exists` });
    }

    const otp = generateOTP();

    await PendingUser.findOneAndUpdate(
      { identifier: value },
      {
        name,
        identifier: value,
        method,
        password_hash: await bcrypt.hash(password, 10),
        otp,
        otp_expires_at: new Date(Date.now() + OTP_TTL_MS),
        expires_at: new Date(Date.now() + PENDING_TTL_MS),
      },
      { upsert: true, new: true }
    );

    await sendOtp(method, value, otp);

    res.json({ message: `OTP sent to your ${method}`, identifier: value, OTP: otp });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A signup with these details is already in progress, please check for the OTP' });
    }
    next(error);
  }
};

const resendRegisterOtp = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    if (!parsed) return res.status(400).json({ message: 'Please provide a valid email address or phone number' });

    const pending = await PendingUser.findOne({ identifier: parsed.value });
    if (!pending) {
      return res.status(404).json({ message: 'No pending signup found, please start registration again' });
    }

    const otp = generateOTP();
    pending.otp = otp;
    pending.otp_expires_at = new Date(Date.now() + OTP_TTL_MS);
    pending.expires_at = new Date(Date.now() + PENDING_TTL_MS);
    await pending.save();

    await sendOtp(pending.method, pending.identifier, otp);
    res.json({ message: 'A new OTP has been sent' });
  } catch (error) {
    next(error);
  }
};

const verifyRegister = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    const parsed = parseIdentifier(identifier);
    if (!parsed || !otp) {
      return res.status(400).json({ message: 'identifier and otp are required' });
    }

    const pending = await PendingUser.findOne({ identifier: parsed.value });
    if (!pending) {
      return res.status(400).json({ message: 'No pending signup found, please register again' });
    }
    if (new Date() > pending.otp_expires_at) {
      return res.status(400).json({ message: 'This OTP has expired, please request a new one' });
    }
    if (pending.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    const existingUser = await findUserByIdentifier(pending.method, pending.identifier);
    if (existingUser) {
      await PendingUser.deleteOne({ _id: pending._id });
      return res.status(409).json({ message: `An account with this ${pending.method} already exists` });
    }

    const user = await User.create({
      name: pending.name,
      [pending.method]: pending.identifier,
      password_hash: pending.password_hash,
      role: 'customer',
      is_verified: true,
    });

    await PendingUser.deleteOne({ _id: pending._id });

    const { accessToken } = issueAuthTokens(res, user);
    res.status(201).json({ message: 'Account created and verified successfully', accessToken, user: await publicUser(user) });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    const { password } = req.body;
    if (!parsed || !password) {
      return res.status(400).json({ message: 'Email/phone and password are required' });
    }

    const foundUser = await User.findOne(
      parsed.method === 'email' ? { email: parsed.value } : { phone: parsed.value }
    ).select('+password_hash');
    if (!foundUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!foundUser.is_active) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const { accessToken } = issueAuthTokens(res, foundUser);
    res.json({ message: 'Logged in successfully', accessToken, user: await publicUser(foundUser) });
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ message: 'Google sign-in is not configured on this server' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired Google credential' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Could not read your Google account details' });
    }
    if (payload.email_verified === false) {
      return res.status(400).json({ message: 'Your Google email is not verified' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ $or: [{ google_id: payload.sub }, { email }] });

    if (user) {
      if (!user.is_active) {
        return res.status(403).json({ message: 'This account has been deactivated' });
      }
      let dirty = false;
      if (!user.google_id) {
        user.google_id = payload.sub;
        dirty = true;
      }
      if (!user.is_verified) {
        user.is_verified = true;
        dirty = true;
      }
      if (!user.avatar_url && payload.picture) {
        user.avatar_url = payload.picture;
        dirty = true;
      }
      if (dirty) await user.save();
    } else {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        google_id: payload.sub,
        password_hash: await bcrypt.hash(randomPassword, 10),
        role: 'customer',
        is_verified: true,
        avatar_url: payload.picture || null,
      });
    }

    const { accessToken } = issueAuthTokens(res, user);
    res.json({ message: 'Signed in with Google successfully', accessToken, user: await publicUser(user) });
  } catch (error) {
    next(error);
  }
};

const requestLoginOtp = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    if (!parsed) return res.status(400).json({ message: 'Please provide a valid email address or phone number' });

    const user = await findUserByIdentifier(parsed.method, parsed.value);
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email/phone' });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const otp = generateOTP();
    await Otp.findOneAndUpdate(
      { identifier: parsed.value, purpose: 'login' },
      { otp, otp_expires_at: new Date(Date.now() + OTP_TTL_MS), expires_at: new Date(Date.now() + OTP_TTL_MS) },
      { upsert: true }
    );
    await sendOtp(parsed.method, parsed.value, otp);

    res.json({ message: `OTP sent to your ${parsed.method}` });
  } catch (error) {
    next(error);
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    const { otp } = req.body;
    if (!parsed || !otp) {
      return res.status(400).json({ message: 'identifier and otp are required' });
    }

    const record = await Otp.findOne({ identifier: parsed.value, purpose: 'login' });
    if (!record) return res.status(400).json({ message: 'No OTP request found, please request a new one' });
    if (new Date() > record.otp_expires_at) return res.status(400).json({ message: 'This OTP has expired, please request a new one' });
    if (record.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    const user = await findUserByIdentifier(parsed.method, parsed.value);
    if (!user) return res.status(404).json({ message: 'No account found with this email/phone' });

    await Otp.deleteOne({ _id: record._id });

    const { accessToken } = issueAuthTokens(res, user);
    res.json({ message: 'Logged in successfully', accessToken, user: await publicUser(user) });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    if (!parsed) return res.status(400).json({ message: 'Please provide a valid email address or phone number' });

    const user = await findUserByIdentifier(parsed.method, parsed.value);

    if (user) {
      const otp = generateOTP();
      await Otp.findOneAndUpdate(
        { identifier: parsed.value, purpose: 'reset_password' },
        {
          otp,
          verified: false,
          otp_expires_at: new Date(Date.now() + OTP_TTL_MS),
          expires_at: new Date(Date.now() + OTP_TTL_MS),
        },
        { upsert: true }
      );
      await sendOtp(parsed.method, parsed.value, otp);
    }

    res.json({ message: `If an account exists, an OTP has been sent to your ${parsed.method}` });
  } catch (error) {
    next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    const { otp } = req.body;
    if (!parsed || !otp) {
      return res.status(400).json({ message: 'identifier and otp are required' });
    }

    const record = await Otp.findOne({ identifier: parsed.value, purpose: 'reset_password' });
    if (!record) return res.status(400).json({ message: 'No reset request found, please request a new OTP' });
    if (new Date() > record.otp_expires_at) return res.status(400).json({ message: 'This OTP has expired, please request a new one' });
    if (record.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    record.verified = true;
    await record.save();

    res.json({ message: 'OTP verified, you can now set a new password' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const parsed = parseIdentifier(req.body.identifier);
    const { newPassword, confirmPassword } = req.body;
    if (!parsed || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'identifier, newPassword and confirmPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const record = await Otp.findOne({ identifier: parsed.value, purpose: 'reset_password' });
    if (!record || !record.verified) {
      return res.status(400).json({ message: 'Please verify the OTP before setting a new password' });
    }
    if (new Date() > record.otp_expires_at) {
      return res.status(400).json({ message: 'This OTP has expired, please request a new one' });
    }

    const user = await User.findOne(
      parsed.method === 'email' ? { email: parsed.value } : { phone: parsed.value }
    ).select('+password_hash');
    if (!user) return res.status(404).json({ message: 'No account found with this email/phone' });

    const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsOld) {
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Otp.deleteOne({ _id: record._id });

    res.json({ message: 'Password reset successfully, please log in with your new password' });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'currentPassword, newPassword and confirmPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const user = await User.findById(req.user.id).select('+password_hash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsOld) {
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'provider') {
      profile = await ProviderProfile.findOne({ user: req.user.id });
    }
    const user = { ...req.user.toJSON(), can_switch_to_provider: await canSwitchToProvider(req.user) };
    res.json({ user, providerProfile: profile });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, location, requirement_radius_km } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      user.name = name.trim();
    }
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (requirement_radius_km !== undefined) {
      const radius = Number(requirement_radius_km);
      if (Number.isNaN(radius) || radius < 1 || radius > 200) {
        return res.status(400).json({ message: 'Requirement radius must be between 1 and 200 km' });
      }
      user.requirement_radius_km = radius;
    }

    await user.save();
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file was uploaded' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ext = (req.file.originalname.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0].toLowerCase();
    const key = `avatars/${user.id}-${Date.now()}${ext}`;
    const { url } = await saveBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });

    const previousAvatarUrl = user.avatar_url;
    user.avatar_url = url;
    await user.save();

    if (previousAvatarUrl) await deleteByUrl(previousAvatarUrl);

    res.json({ message: 'Profile picture updated', user });
  } catch (error) {
    next(error);
  }
};

const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousAvatarUrl = user.avatar_url;
    user.avatar_url = null;
    await user.save();

    if (previousAvatarUrl) await deleteByUrl(previousAvatarUrl);

    res.json({ message: 'Profile picture removed', user });
  } catch (error) {
    next(error);
  }
};

// Cover photo add/update: same storage pattern as the avatar (single image, replaces
// whatever was there before, old file cleaned up from storage). Available to every role.
const updateCoverPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file was uploaded' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ext = (req.file.originalname.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0].toLowerCase();
    const key = `covers/${user.id}-${Date.now()}${ext}`;
    const { url } = await saveBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });

    const previousCoverUrl = user.cover_photo_url;
    user.cover_photo_url = url;
    await user.save();

    if (previousCoverUrl) await deleteByUrl(previousCoverUrl);

    res.json({ message: 'Cover photo updated', user });
  } catch (error) {
    next(error);
  }
};

const removeCoverPhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousCoverUrl = user.cover_photo_url;
    user.cover_photo_url = null;
    await user.save();

    if (previousCoverUrl) await deleteByUrl(previousCoverUrl);

    res.json({ message: 'Cover photo removed', user });
  } catch (error) {
    next(error);
  }
};

const requestContactUpdateOtp = async (req, res, next) => {
  try {
    const { type, value } = req.body;
    if (!['email', 'phone'].includes(type) || !value) {
      return res.status(400).json({ message: 'type ("email" or "phone") and value are required' });
    }

    const parsed = parseIdentifier(value);
    if (!parsed || parsed.method !== type) {
      return res.status(400).json({ message: `Please provide a valid ${type === 'email' ? 'email address' : 'phone number'}` });
    }

    const existing = await findUserByIdentifier(parsed.method, parsed.value);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ message: `This ${type} is already in use by another account` });
    }

    const otp = generateOTP();
    await Otp.findOneAndUpdate(
      { identifier: parsed.value, purpose: 'update_contact' },
      { otp, verified: false, otp_expires_at: new Date(Date.now() + OTP_TTL_MS), expires_at: new Date(Date.now() + OTP_TTL_MS) },
      { upsert: true }
    );
    await sendOtp(parsed.method, parsed.value, otp);

    res.json({ message: `OTP sent to ${parsed.value}` });
  } catch (error) {
    next(error);
  }
};

const verifyContactUpdateOtp = async (req, res, next) => {
  try {
    const { type, value, otp } = req.body;
    if (!['email', 'phone'].includes(type) || !value || !otp) {
      return res.status(400).json({ message: 'type, value and otp are required' });
    }

    const parsed = parseIdentifier(value);
    if (!parsed || parsed.method !== type) {
      return res.status(400).json({ message: `Please provide a valid ${type === 'email' ? 'email address' : 'phone number'}` });
    }

    const record = await Otp.findOne({ identifier: parsed.value, purpose: 'update_contact' });
    if (!record) return res.status(400).json({ message: 'No OTP request found, please request a new one' });
    if (new Date() > record.otp_expires_at) return res.status(400).json({ message: 'This OTP has expired, please request a new one' });
    if (record.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    const existing = await findUserByIdentifier(parsed.method, parsed.value);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ message: `This ${type} is already in use by another account` });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user[type] = parsed.value;
    await user.save();
    await Otp.deleteOne({ _id: record._id });

    res.json({ message: `${type === 'email' ? 'Email' : 'Phone number'} updated successfully`, user });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token is invalid or expired, please log in again' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    const tokenVersionInToken = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
    if ((user.tokenVersion || 0) !== tokenVersionInToken) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token revoked, please log in again' });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    clearRefreshCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateRegister,
  resendRegisterOtp,
  verifyRegister,
  login,
  googleAuth,
  requestLoginOtp,
  verifyLoginOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updateCoverPhoto,
  removeCoverPhoto,
  requestContactUpdateOtp,
  verifyContactUpdateOtp,
  refresh,
  logout,
};