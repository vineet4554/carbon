const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  register,
  login,
  refreshTokens,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  updateProfile
} = require('../controllers/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshTokens);
router.post('/logout', logout);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', confirmPasswordReset);
router.put('/profile', authMiddleware, updateProfile);

router.get('/me', authMiddleware, (req, res) => {
  const userObj = req.user.toObject();
  userObj._id = userObj._id.toString();
  delete userObj.password_hash;
  res.json(userObj);
});

module.exports = router;
