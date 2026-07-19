const TwinSimulation = require('../models/TwinSimulation');

const simulateCarbonTwin = async (req, res) => {
  try {
    const userId = req.user._id;
    const { buy_ev, install_solar, stop_flying, reduce_ac } = req.body;

    // 1. Establish baseline footprint
    const baseline = 512.4;
    let projected = baseline;
    const sources = [];
    const savings = [];

    // 2. Apply simulated reduction values
    if (buy_ev) {
      projected -= 142.3;
      sources.push("EV Commute (reduced tailpipe emissions)");
      savings.push("$90/month on gasoline");
    }
    if (install_solar) {
      projected -= 92.1;
      sources.push("Rooftop Solar generation");
      savings.push("$50/month on utility bill");
    }
    if (stop_flying) {
      projected -= 118.0;
      sources.push("Zero Aviation Flights");
      savings.push("$110/month on tickets (amortized)");
    }
    if (reduce_ac) {
      projected -= 32.5;
      sources.push("Smart Thermostat (AC scheduling)");
      savings.push("$20/month on cooling");
    }

    const reduction = baseline - projected;
    const pct = (reduction / baseline) * 100;

    // 3. Generate seasonal projection trends
    const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    const chart_data = months.map((m, i) => {
      let multiplier = 1.0;
      if (i === 1 || i === 2) multiplier = 1.18; // Summer peak
      return {
        month: m,
        current: Math.round(baseline * multiplier),
        simulated: Math.round(projected * (buy_ev || reduce_ac ? 1.02 : multiplier))
      };
    });

    const savings_usd_desc = savings.length > 0 
      ? `Total estimated savings: ${savings.join(" + ")}` 
      : "No active savings";

    let lifestyle_impact = "Making these adjustments moves your profile towards self-sufficiency and low grid draw. Compounding travel and heating improvements are highly effective.";
    if (buy_ev && install_solar && stop_flying && reduce_ac) {
      lifestyle_impact = "Superb! Committing to all four actions dramatically minimizes your carbon footprint, driving down transportation, electricity, and aviation emissions. You are a true champion of sustainability!";
    } else if (buy_ev || install_solar) {
      lifestyle_impact = "Great start! Targeting your transport and household energy yields the highest reduction in monthly carbon emissions. Keep it up!";
    }

    const top_savings_sources = sources.length > 0 ? sources : ["No active adjustments"];

    // 4. Save simulation record to MongoDB
    const simulationRecord = new TwinSimulation({
      user_id: userId,
      simulated_at: new Date(),
      toggles: { buy_ev, install_solar, stop_flying, reduce_ac },
      results: {
        original_co2_kg: Math.round(baseline),
        projected_co2_kg: Math.round(projected),
        reduction_kg: Math.round(reduction),
        reduction_pct: Math.round(pct),
        savings_usd_desc,
        lifestyle_impact,
        top_savings_sources,
        chart_data
      }
    });

    const savedRecord = await simulationRecord.save();

    res.json({
      id: savedRecord._id.toString(),
      original_co2_kg: Math.round(baseline),
      projected_co2_kg: Math.round(projected),
      reduction_kg: Math.round(reduction),
      reduction_pct: Math.round(pct),
      savings_usd_desc,
      lifestyle_impact,
      top_savings_sources,
      chart_data
    });

  } catch (error) {
    console.error('Carbon twin simulation error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  simulateCarbonTwin
};
