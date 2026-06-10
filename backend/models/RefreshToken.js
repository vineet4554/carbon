const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expires_at: { type: Date, required: true }
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema, 'refresh_tokens');
