const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  country: { type: String, default: 'US' },
  diet_preference: { type: String, default: 'omnivore' },
  household_size: { type: Number, default: 1 },
  has_car: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  profile: { type: ProfileSchema, default: () => ({}) },
  points: { type: Number, default: 0 },
  badges: [{ type: String }],
  streak_current: { type: Number, default: 0 },
  streak_longest: { type: Number, default: 0 },
  last_activity_date: { type: Date },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
