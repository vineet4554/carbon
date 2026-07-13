const RoomAnalysis = require('../models/RoomAnalysis');
const ai = require('../config/gemini');

const scanRoomImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No room image file uploaded.' });
    }

    const userId = req.user._id;
    const roomType = req.body.room_type || 'living_room';

    // 1. Prepare image payload for Google GenAI Node.js SDK
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `
Audit this room image representing a '${roomType}'. Identify electricity-consuming appliances 
and output a green-rating analysis in valid JSON format matching this schema:
{
  "room_type": "string",
  "detected_appliances": [
    {
      "name": "string",
      "type": "Fan" | "AC" | "TV" | "Lights" | "Appliances",
      "energy_efficiency_estimate": "High" | "Medium" | "Low",
      "detected_issues": ["string"],
      "eco_alternative": "string",
      "energy_waste_kwh": float,
      "carbon_impact_kg": float,
      "yearly_cost_usd": float
    }
  ],
  "total_energy_waste_kwh": float,
  "total_carbon_impact_kg": float,
  "total_yearly_cost_usd": float,
  "overall_room_eco_score": integer (0 to 100),
  "recommendations": ["string"]
}

Calculate realistic estimates for energy waste, carbon impact (0.385 kg CO2 per kWh), 
and yearly cost ($0.15 per kWh) based on standard appliance consumption profiles. 
Provide ONLY the JSON output.
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
      console.error('Failed to analyze room snapshot with Gemini:', err.message);
      return res.status(502).json({ detail: 'Gemini AI service error.' });
    }

    // Apply defaults and post-processing
    if (!parsed.detected_appliances) {
      parsed.detected_appliances = [];
    }
    
    parsed.detected_appliances.forEach(app => {
      if (!app.type) {
        const name_lower = (app.name || "").toLowerCase();
        if (name_lower.includes("fan")) app.type = "Fan";
        else if (name_lower.includes("ac") || name_lower.includes("air condition")) app.type = "AC";
        else if (name_lower.includes("tv") || name_lower.includes("television")) app.type = "TV";
        else if (name_lower.includes("light") || name_lower.includes("lamp") || name_lower.includes("bulb")) app.type = "Lights";
        else app.type = "Appliances";
      }
      if (app.energy_waste_kwh === undefined) {
        app.energy_waste_kwh = app.energy_efficiency_estimate === "Low" ? 40.0 : 15.0;
      }
      if (app.carbon_impact_kg === undefined) {
        app.carbon_impact_kg = parseFloat((app.energy_waste_kwh * 0.385).toFixed(2));
      }
      if (app.yearly_cost_usd === undefined) {
        app.yearly_cost_usd = parseFloat((app.energy_waste_kwh * 0.15).toFixed(2));
      }
    });

    if (parsed.total_energy_waste_kwh === undefined) {
      parsed.total_energy_waste_kwh = parseFloat(parsed.detected_appliances.reduce((sum, app) => sum + (app.energy_waste_kwh || 0.0), 0.0).toFixed(2));
    }
    if (parsed.total_carbon_impact_kg === undefined) {
      parsed.total_carbon_impact_kg = parseFloat(parsed.detected_appliances.reduce((sum, app) => sum + (app.carbon_impact_kg || 0.0), 0.0).toFixed(2));
    }
    if (parsed.total_yearly_cost_usd === undefined) {
      parsed.total_yearly_cost_usd = parseFloat(parsed.detected_appliances.reduce((sum, app) => sum + (app.yearly_cost_usd || 0.0), 0.0).toFixed(2));
    }
    if (parsed.overall_room_eco_score === undefined) {
      parsed.overall_room_eco_score = 60;
    }
    if (!parsed.recommendations) {
      parsed.recommendations = ["Ensure appliances are unplugged when not in use."];
    }
    parsed.room_type = parsed.room_type || roomType;

    // 2. Save RoomAnalysis document
    const analysis = new RoomAnalysis({
      user_id: userId,
      image_url: req.file.originalname,
      room_type: parsed.room_type,
      detected_appliances: parsed.detected_appliances,
      total_energy_waste_kwh: parsed.total_energy_waste_kwh,
      total_carbon_impact_kg: parsed.total_carbon_impact_kg,
      total_yearly_cost_usd: parsed.total_yearly_cost_usd,
      overall_room_eco_score: parsed.overall_room_eco_score,
      recommendations: parsed.recommendations,
      analyzed_at: new Date()
    });

    const saved = await analysis.save();

    const resObj = saved.toObject();
    resObj._id = resObj._id.toString();
    resObj.user_id = resObj.user_id.toString();

    res.json(resObj);
  } catch (error) {
    console.error('Scan room image error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const listRoomScans = async (req, res) => {
  try {
    const userId = req.user._id;
    const list = await RoomAnalysis.find({ user_id: userId }).sort({ analyzed_at: -1 });

    const formatted = list.map(item => {
      const itemObj = item.toObject();
      itemObj._id = itemObj._id.toString();
      itemObj.user_id = itemObj.user_id.toString();
      return itemObj;
    });

    res.json(formatted);
  } catch (error) {
    console.error('List room scans error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  scanRoomImage,
  listRoomScans
};
