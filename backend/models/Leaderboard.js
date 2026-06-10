const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username: { type: String, default: 'EcoPilot User' },
  level_name: { type: String, default: 'Eco-Pioneer' },
  points: { type: Number, default: 0 },
  monthly_co2_kg: { type: Number, default: 0.0 },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema, 'leaderboards');
