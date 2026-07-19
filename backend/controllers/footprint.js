const FootprintLog = require('../models/FootprintLog');
const CarbonPrediction = require('../models/CarbonPrediction');
const { awardPoints } = require('../services/gamification');
const {
  calculateEnergy,
  calculateTransport,
  calculateFood,
  calculateWaste
} = require('../services/carbonCalc');

const logFootprint = async (req, res) => {
  try {
    const userId = req.user._id;
    const { energy, transport, food, waste, date } = req.body;

    let totalCo2 = 0.0;
    const categories = {};

    if (energy) {
      const energyCo2 = calculateEnergy(energy.kwh);
      categories.energy = { kwh: energy.kwh, co2_kg: energyCo2 };
      totalCo2 += energyCo2;
    }

    if (transport) {
      const transCo2 = calculateTransport(transport.distance_km, transport.mode);
      categories.transport = {
        mode: transport.mode,
        distance_km: transport.distance_km,
        co2_kg: transCo2
      };
      totalCo2 += transCo2;
    }

    if (food) {
      const foodCo2 = calculateFood(food.diet_type);
      categories.food = { diet_type: food.diet_type, co2_kg: foodCo2 };
      totalCo2 += foodCo2;
    }

    if (waste) {
      const wasteCo2 = calculateWaste(waste.waste_weight_kg, waste.recycled);
      categories.waste = {
        waste_weight_kg: waste.waste_weight_kg,
        recycled: waste.recycled,
        co2_kg: wasteCo2
      };
      totalCo2 += wasteCo2;
    }

    const logEntry = new FootprintLog({
      user_id: userId,
      date: date ? new Date(date) : new Date(),
      categories,
      total_co2_kg: parseFloat(totalCo2.toFixed(2))
    });

    const savedLog = await logEntry.save();

    // Award points
    try {
      await awardPoints(userId, 'daily_tracking');
    } catch (err) {
      console.error('Failed to award daily tracking points:', err.message);
    }

    const responseObj = savedLog.toObject();
    responseObj._id = responseObj._id.toString();
    responseObj.user_id = responseObj.user_id.toString();

    res.status(201).json(responseObj);
  } catch (error) {
    console.error('Log footprint error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const logs = await FootprintLog.find({ user_id: userId }).sort({ date: -1 }).limit(100);
    
    const formattedLogs = logs.map(log => {
      const logObj = log.toObject();
      logObj._id = logObj._id.toString();
      logObj.user_id = logObj.user_id.toString();
      return logObj;
    });

    res.json(formattedLogs);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const predictTrends = async (req, res) => {
  try {
    const userId = req.user._id;
    const monthsAhead = 6;

    const logs = await FootprintLog.find({ user_id: userId }).sort({ date: 1 });
    const baseline = 450.0;
    const now = new Date();
    const projections = [];

    if (logs.length === 0) {
      for (let i = 1; i <= monthsAhead; i++) {
        const futureDate = new Date();
        futureDate.setMonth(now.getMonth() + i);
        const dateStr = futureDate.toISOString().slice(0, 7); // YYYY-MM
        projections.push({
          date: dateStr,
          co2_kg: baseline,
          confidence: 'low'
        });
      }
    } else {
      const xValues = [];
      const yValues = [];
      const firstDate = new Date(logs[0].date);

      for (const log of logs) {
        const logDate = new Date(log.date);
        const days = Math.floor((logDate - firstDate) / (1000 * 60 * 60 * 24));
        xValues.push(days);
        yValues.push(log.total_co2_kg || baseline);
      }

      const n = logs.length;
      const uniqueX = new Set(xValues);

      let slope = 0.0;
      let intercept = 0.0;

      if (n >= 2 && uniqueX.size > 1) {
        const meanX = xValues.reduce((a, b) => a + b, 0) / n;
        const meanY = yValues.reduce((a, b) => a + b, 0) / n;

        let num = 0.0;
        let den = 0.0;
        for (let i = 0; i < n; i++) {
          num += (xValues[i] - meanX) * (yValues[i] - meanY);
          den += Math.pow(xValues[i] - meanX, 2);
        }

        slope = den !== 0 ? num / den : 0.0;
        intercept = meanY - slope * meanX;
      } else {
        slope = 0.0;
        intercept = yValues.reduce((a, b) => a + b, 0) / n;
      }

      const lastDays = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24));

      for (let i = 1; i <= monthsAhead; i++) {
        const futureDate = new Date();
        futureDate.setMonth(now.getMonth() + i);
        const futureDays = lastDays + (30 * i);
        
        let predictedCo2 = slope * futureDays + intercept;
        predictedCo2 = Math.max(predictedCo2, 0.0);

        projections.push({
          date: futureDate.toISOString().slice(0, 7),
          co2_kg: parseFloat(predictedCo2.toFixed(2)),
          confidence: n >= 5 ? 'high' : 'medium'
        });
      }
    }

    // Save predictions to MongoDB
    for (const proj of projections) {
      try {
        await CarbonPrediction.findOneAndUpdate(
          { user_id: userId, target_date: proj.date },
          {
            predicted_co2_kg: proj.co2_kg,
            confidence: proj.confidence,
            created_at: new Date()
          },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err) {
        console.error('Failed to upsert carbon prediction:', err.message);
      }
    }

    res.json(projections);
  } catch (error) {
    console.error('Predict trends error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const runLifestyleSimulation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { change_transport_mode, diet_change, solar_installation } = req.body;

    const logs = await FootprintLog.find({ user_id: userId }).limit(100);
    let currentCo2 = 450.0;

    if (logs.length > 0) {
      const total = logs.reduce((sum, log) => sum + log.total_co2_kg, 0);
      currentCo2 = total / logs.length;
    }

    let projectedCo2 = currentCo2;
    const recs = [];

    if (change_transport_mode) {
      const oldTransport = calculateTransport(25, 'petrol');
      const newTransport = calculateTransport(25, change_transport_mode);
      const diff = oldTransport - newTransport;
      projectedCo2 -= (diff * 30);
      recs.push(`Changing commute to ${change_transport_mode} reduces transport footprint.`);
    }

    if (diet_change) {
      const oldFood = calculateFood('omnivore');
      const newFood = calculateFood(diet_change);
      const diff = oldFood - newFood;
      projectedCo2 -= (diff * 30);
      recs.push(`Transitioning to a ${diet_change} diet reduces culinary footprint.`);
    }

    if (solar_installation) {
      const energyCo2 = calculateEnergy(350.0);
      const offset = energyCo2 * 0.80;
      projectedCo2 -= offset;
      recs.push('Solar installation will offset approximately 80% of residential energy draw.');
    }

    projectedCo2 = Math.max(projectedCo2, 0.0);

    let savingPct = 0.0;
    if (currentCo2 > 0) {
      savingPct = parseFloat((((currentCo2 - projectedCo2) / currentCo2) * 100).toFixed(2));
      savingPct = Math.max(savingPct, 0.0);
    }

    res.json({
      original_co2_kg: parseFloat(currentCo2.toFixed(2)),
      projected_co2_kg: parseFloat(projectedCo2.toFixed(2)),
      potential_saving_percentage: savingPct,
      recommendations: recs
    });
  } catch (error) {
    console.error('Run simulation error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  logFootprint,
  getHistory,
  predictTrends,
  runLifestyleSimulation
};
