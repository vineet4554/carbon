const mongoose = require('mongoose');

const BillAnalysisSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_url: { type: String, required: true },
  billing_period: { type: String, required: true },
  consumption_value: { type: Number, required: true },
  consumption_unit: { type: String, required: true },
  total_cost: { type: Number, required: true },
  carbon_footprint_kg: { type: Number, required: true },
  savings_opportunities: [{ type: String }],
  trend: { type: mongoose.Schema.Types.Mixed, default: {} },
  extracted_raw_text: { type: String, default: '' },
  analyzed_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BillAnalysis', BillAnalysisSchema);
