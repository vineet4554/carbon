const mongoose = require('mongoose');

const ApplianceAuditSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  energy_efficiency_estimate: { type: String, required: true }, // "High", "Medium", "Low"
  detected_issues: [{ type: String }],
  eco_alternative: { type: String, required: true },
  energy_waste_kwh: { type: Number, default: 0.0 },
  carbon_impact_kg: { type: Number, default: 0.0 },
  yearly_cost_usd: { type: Number, default: 0.0 }
}, { _id: false });

const RoomAnalysisSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image_url: { type: String, required: true },
  room_type: { type: String, required: true },
  detected_appliances: [ApplianceAuditSchema],
  total_energy_waste_kwh: { type: Number, default: 0.0 },
  total_carbon_impact_kg: { type: Number, default: 0.0 },
  total_yearly_cost_usd: { type: Number, default: 0.0 },
  overall_room_eco_score: { type: Number, required: true },
  recommendations: [{ type: String }],
  analyzed_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoomAnalysis', RoomAnalysisSchema);
