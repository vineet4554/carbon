const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordReset = require('../models/PasswordReset');

const getPasswordHash = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const createAccessToken = (email) => {
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresMinutes = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '1440', 10);
  const payload = {
    sub: email,
    type: 'access'
  };
  return jwt.sign(payload, secret, { expiresIn: `${expiresMinutes}m` });
};

const createRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const register = async (req, res) => {
  try {
    const { email, password, full_name, profile } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ detail: 'Email, password, and full name are required.' });
    }

    // Password complexity check to match python field_validator
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) {
      return res.status(400).json({ 
        detail: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number.' 
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email address is already registered.' });
    }

    const passwordHash = await getPasswordHash(password);
    
    const newUser = new User({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name,
      profile: profile || {}
    });

    const user = await newUser.save();

    const accessToken = createAccessToken(user.email);
    const refreshTokenValue = createRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    const dbToken = new RefreshToken({
      token: refreshTokenValue,
      user_id: user._id,
      expires_at: expiresAt
    });
    await dbToken.save();

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: 'bearer',
      full_name: user.full_name
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password credentials.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ detail: 'Invalid email or password credentials.' });
    }

    const accessToken = createAccessToken(user.email);
    const refreshTokenValue = createRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const dbToken = new RefreshToken({
      token: refreshTokenValue,
      user_id: user._id,
      expires_at: expiresAt
    });
    await dbToken.save();

    res.json({
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: 'bearer',
      full_name: user.full_name
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const refreshTokens = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ detail: 'Refresh token is required.' });
    }

    const dbToken = await RefreshToken.findOne({ token: refresh_token });
    if (!dbToken) {
      return res.status(401).json({ detail: 'Invalid or revoked refresh token.' });
    }

    if (new Date() > new Date(dbToken.expires_at)) {
      await RefreshToken.deleteOne({ token: refresh_token });
      return res.status(401).json({ detail: 'Refresh token has expired.' });
    }

    const user = await User.findById(dbToken.user_id);
    if (!user) {
      return res.status(401).json({ detail: 'User associated with token not found.' });
    }

    await RefreshToken.deleteOne({ token: refresh_token });

    const newAccessToken = createAccessToken(user.email);
    const newRefreshTokenValue = createRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newDbToken = new RefreshToken({
      token: newRefreshTokenValue,
      user_id: user._id,
      expires_at: expiresAt
    });
    await newDbToken.save();

    res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshTokenValue,
      token_type: 'bearer',
      full_name: user.full_name
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ detail: 'Refresh token is required.' });
    }

    const deleted = await RefreshToken.deleteOne({ token: refresh_token });
    if (deleted.deletedCount === 0) {
      return res.status(400).json({ detail: 'Token was already revoked or is invalid.' });
    }

    res.json({ message: 'Successfully logged out.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ detail: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If the email is registered, a reset link will be sent.' });
    }

    const resetToken = createRefreshToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    const dbReset = new PasswordReset({
      token: resetToken,
      email: email.toLowerCase(),
      expires_at: expiresAt
    });
    await dbReset.save();

    console.log(`[PASSWORD RESET] Token issued for ${email} | Expiration: ${expiresAt.toISOString()}`);

    res.json({ message: 'If the email is registered, a reset link will be sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const confirmPasswordReset = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ detail: 'Token and new password are required.' });
    }

    // Password complexity check
    if (!/[A-Z]/.test(new_password) || !/[a-z]/.test(new_password) || !/[0-9]/.test(new_password) || new_password.length < 8) {
      return res.status(400).json({ 
        detail: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number.' 
      });
    }

    const dbReset = await PasswordReset.findOne({ token });
    if (!dbReset) {
      return res.status(400).json({ detail: 'Invalid or expired reset token.' });
    }

    if (new Date() > new Date(dbReset.expires_at)) {
      await PasswordReset.deleteOne({ token });
      return res.status(400).json({ detail: 'Reset token has expired.' });
    }

    const user = await User.findOne({ email: dbReset.email });
    if (!user) {
      await PasswordReset.deleteOne({ token });
      return res.status(400).json({ detail: 'User associated with reset token not found.' });
    }

    const passwordHash = await getPasswordHash(new_password);
    user.password_hash = passwordHash;
    await user.save();

    await PasswordReset.deleteOne({ token });
    await RefreshToken.deleteMany({ user_id: user._id });

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { full_name, profile } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found.' });
    }

    if (full_name !== undefined) {
      user.full_name = full_name;
    }
    if (profile !== undefined) {
      user.profile = {
        ...user.profile.toObject(),
        ...profile
      };
    }

    await user.save();

    const userObj = user.toObject();
    userObj._id = userObj._id.toString();
    delete userObj.password_hash;

    res.json({
      message: 'Profile updated successfully!',
      user: userObj
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  updateProfile
};
