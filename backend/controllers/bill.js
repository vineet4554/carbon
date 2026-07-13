const BillAnalysis = require('../models/BillAnalysis');
const FootprintLog = require('../models/FootprintLog');
const { awardPoints } = require('../services/gamification');
const { calculateEnergy } = require('../services/carbonCalc');
const ai = require('../config/gemini');

const calculateCarbonFootprint = (value, unit) => {
  const uLower = (unit || '').toLowerCase();
  if (uLower === 'kwh') {
    return parseFloat(calculateEnergy(value).toFixed(2));
  } else if (uLower === 'therms') {
    return parseFloat((value * 5.3).toFixed(2));
  } else if (uLower === 'gallons' || uLower === 'gallon') {
    return parseFloat((value * 0.003).toFixed(2));
  } else if (uLower === 'liters' || uLower === 'liter') {
    return parseFloat((value * 0.0008).toFixed(2));
  } else if (uLower === 'ccf') {
    return parseFloat((value * 5.5).toFixed(2));
  } else {
    return parseFloat((value * 0.4).toFixed(2));
  }
};

const calculateTrend = async (userId, currentPeriod, currentValue, currentCost, currentUnit) => {
  try {
    const history = await BillAnalysis.find({
      user_id: userId,
      consumption_unit: currentUnit
    });

    const filteredHistory = history.filter(h => h.billing_period !== currentPeriod);

    if (filteredHistory.length === 0) {
      return {
        percentage_change: 0.0,
        direction: 'stable',
        compared_to_period: 'none',
        previous_value: 0.0,
        previous_cost: 0.0
      };
    }

    filteredHistory.sort((a, b) => b.billing_period.localeCompare(a.billing_period));
    const prevBill = filteredHistory[0];

    const prevVal = prevBill.consumption_value || 0.0;
    const prevCost = prevBill.total_cost || 0.0;

    let pctChange = 0.0;
    if (prevVal > 0) {
      pctChange = ((currentValue - prevVal) / prevVal) * 100;
    }

    const direction = pctChange >= 0 ? 'increase' : 'decrease';

    return {
      percentage_change: parseFloat(Math.abs(pctChange).toFixed(2)),
      direction,
      compared_to_period: prevBill.billing_period,
      previous_value: prevVal,
      previous_cost: prevCost
    };
  } catch (err) {
    console.error('Error calculating bill trends:', err.message);
    return {
      percentage_change: 0.0,
      direction: 'stable',
      compared_to_period: 'error',
      previous_value: 0.0,
      previous_cost: 0.0
    };
  }
};

const uploadBill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No statement file uploaded.' });
    }

    const userId = req.user._id;

    // 1. Prepare image payload for Google GenAI Node.js SDK
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `
You are the EcoPilot AI Bill Auditor. Analyze the uploaded utility bill document.

Extract the following metrics:
1. Billing Period: The month and year of the bill (formatted strictly as 'YYYY-MM', e.g. '2025-05'). Look at the billing period dates or statement date.
2. Consumption Value: The quantity of resource consumed (float). For electricity, this is the units consumed (kWh).
3. Consumption Unit: The unit of measurement (standard choices: 'kWh' for electricity, 'therms' for gas, 'gallons' or 'liters' or 'ccf' for water, or default to 'kWh' if unclear).
4. Total Cost: The total bill cost / amount due (float).
5. Savings Opportunities: A list of 3 specific, highly tailored energy/water-saving recommendations based on the resource consumed and usage volume.

Respond with a JSON object matching this schema – no markdown fences:
{
    "billing_period": "YYYY-MM",
    "consumption_value": float,
    "consumption_unit": "kWh" | "therms" | "gallons" | "liters" | "ccf",
    "total_cost": float,
    "savings_opportunities": ["recommendation 1", "recommendation 2", "recommendation 3"]
}
`;

    let parsed = {};
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, imagePart],
        config: {
          responseMimeType: 'application/json'
        }
      });
      parsed = JSON.parse(response.text);
    } catch (err) {
      console.error('Failed to parse bill with Gemini:', err.message);
      return res.status(502).json({ detail: 'Gemini AI service error.' });
    }

    // Apply defaults if values are missing
    if (!parsed.billing_period) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      parsed.billing_period = `${now.getFullYear()}-${month}`;
    }
    if (parsed.consumption_value === undefined || parsed.consumption_value === null) {
      parsed.consumption_value = 350.0;
    }
    if (!parsed.consumption_unit) {
      parsed.consumption_unit = "kWh";
    }
    if (parsed.total_cost === undefined || parsed.total_cost === null) {
      parsed.total_cost = 55.0;
    }
    if (!parsed.savings_opportunities || parsed.savings_opportunities.length === 0) {
      parsed.savings_opportunities = [
        "Inspect appliances for continuous base loads.",
        "Switch to energy-efficient LED light bulbs.",
        "Adjust smart thermostat settings for peak hours."
      ];
    }
    const extracted_raw_text = `Multimodal Scan Results:\nPeriod: ${parsed.billing_period}\nConsumption: ${parsed.consumption_value} ${parsed.consumption_unit}\nCost: ${parsed.total_cost}`;

    // 2. Compute carbon footprint
    const carbonFootprint = calculateCarbonFootprint(parsed.consumption_value, parsed.consumption_unit);

    // 3. Compute trend comparison
    const trendData = await calculateTrend(
      userId,
      parsed.billing_period,
      parsed.consumption_value,
      parsed.total_cost,
      parsed.consumption_unit
    );

    // 4. Save bill analysis
    const billEntry = new BillAnalysis({
      user_id: userId,
      file_url: req.file.originalname,
      billing_period: parsed.billing_period,
      consumption_value: parsed.consumption_value,
      consumption_unit: parsed.consumption_unit,
      total_cost: parsed.total_cost,
      carbon_footprint_kg: carbonFootprint,
      savings_opportunities: parsed.savings_opportunities,
      trend: trendData,
      extracted_raw_text: extracted_raw_text.slice(0, 1000),
      analyzed_at: new Date()
    });

    const savedBill = await billEntry.save();

    // 5. Save footprint log
    let category = 'energy';
    const uLower = parsed.consumption_unit.toLowerCase();
    if (uLower === 'therms') {
      category = 'gas';
    } else if (['gallons', 'liters', 'ccf', 'gallon', 'liter'].includes(uLower)) {
      category = 'water';
    }

    const footprintEntry = new FootprintLog({
      user_id: userId,
      date: new Date(),
      categories: {
        [category]: {
          usage: parsed.consumption_value,
          unit: parsed.consumption_unit,
          co2_kg: carbonFootprint
        }
      },
      total_co2_kg: carbonFootprint
    });
    await footprintEntry.save();

    // 6. Award gamification points
    try {
      await awardPoints(userId, 'bill_upload');
    } catch (err) {
      console.error('Failed to award bill upload points:', err.message);
    }

    const resObj = savedBill.toObject();
    resObj._id = resObj._id.toString();
    resObj.user_id = resObj.user_id.toString();

    res.json(resObj);
  } catch (error) {
    console.error('Upload bill error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getBills = async (req, res) => {
  try {
    const userId = req.user._id;
    const history = await BillAnalysis.find({ user_id: userId }).sort({ analyzed_at: -1 });
    
    const formatted = history.map(h => {
      const hObj = h.toObject();
      hObj._id = hObj._id.toString();
      hObj.user_id = hObj.user_id.toString();
      return hObj;
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get bills history error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  uploadBill,
  getBills
};
