const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quest_title: { type: String, required: true },
  description: { type: String, required: true },
  xp_yield: { type: Number, default: 50 },
  goal_amount: { type: Number, default: 1 },
  current_amount: { type: Number, default: 0 },
  category: { type: String, default: 'food' }, // food, transport, energy, waste
  status: { type: String, default: 'in_progress' }, // in_progress, completed, claimed
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Challenge', ChallengeSchema, 'challenges');
