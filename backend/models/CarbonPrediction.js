const mongoose = require('mongoose');

const CarbonPredictionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target_date: { type: String, required: true }, // Format YYYY-MM
  predicted_co2_kg: { type: Number, required: true },
  confidence: { type: String, default: 'medium' }, // high, medium, low
  created_at: { type: Date, default: Date.now }
});

// Compound unique index on user_id and target_date to match database.py
CarbonPredictionSchema.index({ user_id: 1, target_date: 1 }, { unique: true });

module.exports = mongoose.model('CarbonPrediction', CarbonPredictionSchema, 'carbon_predictions');
