const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const getDemoUser = async () => {
  let demoUser = await User.findOne({ email: 'demo@ecopilot.ai' });
  if (demoUser) {
    return demoUser;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  demoUser = new User({
    email: 'demo@ecopilot.ai',
    password_hash: passwordHash,
    full_name: 'EcoPilot Demo User',
    profile: {
      country: 'US',
      diet_preference: 'vegetarian',
      household_size: 2,
      has_car: true
    }
  });

  await demoUser.save();
  return demoUser;
};

const authMiddleware = async (req, res, next) => {
  try {
    let token = '';

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check query params
    else if (req.query.token) {
      token = req.query.token;
    }

    const isProduction = process.env.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production';

    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret);

        if (decoded.type !== 'access') {
          return res.status(401).json({ detail: 'Invalid token type.' });
        }

        const user = await User.findOne({ email: decoded.sub });
        if (!user) {
          return res.status(401).json({ detail: 'User associated with this token was not found.' });
        }

        req.user = user;
        return next();
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ detail: 'Token has expired. Please log in again.' });
        }
        return res.status(401).json({ detail: 'Invalid token credentials.' });
      }
    }

    if (isProduction) {
      return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
    }

    // Auto-login demo user in development
    const demo = await getDemoUser();
    req.user = demo;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = { authMiddleware, getDemoUser };
