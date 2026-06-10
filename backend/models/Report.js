const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  report_type: { type: String, required: true }, // weekly or monthly
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  carbon_trend: { type: mongoose.Schema.Types.Mixed, default: {} },
  predictions: [{ type: mongoose.Schema.Types.Mixed }],
  achievements: { type: mongoose.Schema.Types.Mixed, default: {} },
  suggestions: [{ type: mongoose.Schema.Types.Mixed }],
  ai_summary: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema, 'reports');
