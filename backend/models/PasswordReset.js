const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  expires_at: { type: Date, required: true }
});

module.exports = mongoose.model('PasswordReset', PasswordResetSchema, 'password_resets');
