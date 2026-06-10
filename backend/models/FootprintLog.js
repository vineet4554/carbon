const mongoose = require('mongoose');

const FootprintLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  categories: {
    energy: {
      kwh: { type: Number, default: 0.0 },
      co2_kg: { type: Number, default: 0.0 }
    },
    transport: {
      mode: { type: String, default: 'none' },
      distance_km: { type: Number, default: 0.0 },
      co2_kg: { type: Number, default: 0.0 }
    },
    food: {
      diet_type: { type: String, default: 'omnivore' },
      co2_kg: { type: Number, default: 0.0 }
    },
    waste: {
      waste_weight_kg: { type: Number, default: 0.0 },
      recycled: { type: Boolean, default: false },
      co2_kg: { type: Number, default: 0.0 }
    }
  },
  total_co2_kg: { type: Number, required: true }
});

module.exports = mongoose.model('FootprintLog', FootprintLogSchema);
