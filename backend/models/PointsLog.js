const mongoose = require('mongoose');

const PointsLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  reason: { type: String, required: true }, // e.g. "bill_upload", "challenge_completed"
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PointsLog', PointsLogSchema, 'points_logs');
