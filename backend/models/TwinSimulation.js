const mongoose = require('mongoose');

const TwinSimulationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  simulated_at: { type: Date, default: Date.now },
  toggles: {
    buy_ev: { type: Boolean, default: false },
    install_solar: { type: Boolean, default: false },
    stop_flying: { type: Boolean, default: false },
    reduce_ac: { type: Boolean, default: false }
  },
  results: {
    original_co2_kg: { type: Number, required: true },
    projected_co2_kg: { type: Number, required: true },
    reduction_kg: { type: Number, required: true },
    reduction_pct: { type: Number, required: true },
    savings_usd_desc: { type: String, default: '' },
    lifestyle_impact: { type: String, default: '' },
    top_savings_sources: [{ type: String }],
    chart_data: [{
      month: { type: String, required: true },
      current: { type: Number, required: true },
      simulated: { type: Number, required: true }
    }]
  }
});

module.exports = mongoose.model('TwinSimulation', TwinSimulationSchema, 'carbon_twin_simulations');
