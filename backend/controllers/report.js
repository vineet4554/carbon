const axios = require('axios');
const Report = require('../models/Report');
const ai = require('../config/gemini');
const FootprintLog = require('../models/FootprintLog');
const CarbonPrediction = require('../models/CarbonPrediction');
const User = require('../models/User');
const { getUserStats } = require('../services/gamification');
const { generateReportPdf } = require('../services/pdfService');
const { sendReportEmail } = require('../services/emailService');

const getEmissionsPredictions = async (userId, monthsAhead = 3) => {
  const logs = await FootprintLog.find({ user_id: userId }).sort({ date: 1 });
  const baseline = 450.0;
  const now = new Date();
  const projections = [];

  if (logs.length === 0) {
    for (let i = 1; i <= monthsAhead; i++) {
      const futureDate = new Date();
      futureDate.setMonth(now.getMonth() + i);
      projections.push({
        date: futureDate.toISOString().slice(0, 7),
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

  // Save/upsert predictions
  for (const proj of projections) {
    try {
      await CarbonPrediction.findOneAndUpdate(
        { user_id: userId, target_date: proj.date },
        {
          predicted_co2_kg: proj.co2_kg,
          confidence: proj.confidence,
          created_at: new Date()
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to upsert carbon prediction in report generator:', err.message);
    }
  }

  return projections;
};

const generateReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { report_type, send_email } = req.body;

    const reportTypeVal = report_type || 'monthly';
    const sendEmailVal = send_email || false;

    // 1. Determine date ranges
    const endDate = new Date();
    let startDate = new Date();
    let priorStartDate = new Date();
    let priorEndDate = new Date();

    if (reportTypeVal === 'weekly') {
      startDate.setDate(endDate.getDate() - 7);
      priorStartDate.setDate(endDate.getDate() - 14);
      priorEndDate.setDate(endDate.getDate() - 7);
    } else { // monthly
      startDate.setDate(endDate.getDate() - 30);
      priorStartDate.setDate(endDate.getDate() - 60);
      priorEndDate.setDate(endDate.getDate() - 30);
    }

    // 2. Compute carbon trend
    const currentLogs = await FootprintLog.find({
      user_id: userId,
      date: { $gte: startDate, $lte: endDate }
    });
    const currentCo2 = currentLogs.reduce((sum, log) => sum + (log.total_co2_kg || 0.0), 0.0);

    const priorLogs = await FootprintLog.find({
      user_id: userId,
      date: { $gte: priorStartDate, $lte: priorEndDate }
    });
    const priorCo2 = priorLogs.reduce((sum, log) => sum + (log.total_co2_kg || 0.0), 0.0);

    let pctChange = 0.0;
    if (priorCo2 > 0) {
      pctChange = ((currentCo2 - priorCo2) / priorCo2) * 100;
    }

    const direction = currentCo2 < priorCo2 ? 'decrease' : currentCo2 > priorCo2 ? 'increase' : 'stable';
    const carbonTrend = {
      total_co2_kg: parseFloat(currentCo2.toFixed(2)),
      previous_co2_kg: parseFloat(priorCo2.toFixed(2)),
      percentage_change: parseFloat(Math.abs(pctChange).toFixed(2)),
      direction
    };

    // 3. Retrieve predictions (3 months ahead)
    const predictions = await getEmissionsPredictions(userId, 3);

    // 4. Gather achievements
    const stats = await getUserStats(userId);
    const achievements = {
      xp_earned: stats.points || 0,
      badges_unlocked: stats.badges || []
    };

    // 5. Suggestions
    const suggestions = [
      {
        category: 'energy',
        recommendation: 'Replace standard light bulbs with high-efficiency 9W LEDs.',
        difficulty: 'Easy',
        co2_reduction: '25 kg CO2 / month'
      },
      {
        category: 'transport',
        recommendation: 'Switch daily travel commutes to electric vehicles or public transit.',
        difficulty: 'Medium',
        co2_reduction: '150 kg CO2 / month'
      },
      {
        category: 'food',
        recommendation: 'Adopt a low-impact plant-based vegetarian or vegan diet 4 days a week.',
        difficulty: 'Easy',
        co2_reduction: '60 kg CO2 / month'
      }
    ];

    // 6. Request AI narrative summary from Gemini
    let aiSummary = '';
    const total_co2 = carbonTrend.total_co2_kg || 0.0;
    const prev_co2 = carbonTrend.previous_co2_kg || 0.0;
    const pct = carbonTrend.percentage_change || 0.0;
    const dir = carbonTrend.direction || 'stable';
    const xp = achievements.xp_earned || 0;
    const badges = achievements.badges_unlocked || [];

    const prompt = `
You are EcoPilot, a personal AI sustainability coach.

User's ${reportTypeVal} report stats:
- Total CO₂: ${total_co2.toFixed(2)} kg
- Previous period: ${prev_co2.toFixed(2)} kg
- Change: ${pct.toFixed(1)}% (${dir})
- XP earned: +${xp}
- New badges: ${badges.length > 0 ? badges.join(', ') : 'None'}

Write a concise, encouraging executive summary (max 5 sentences, under 120 words).
`;

    try {
      const summaryRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are EcoPilot. Write clear, encouraging progress summaries.',
          temperature: 0.7,
          maxOutputTokens: 512
        }
      });
      aiSummary = (summaryRes.text || '').trim();
    } catch (err) {
      console.error('Failed to generate AI report summary with Gemini:', err.message);
      aiSummary = 
        `EcoPilot report review: Carbon footprint was ${currentCo2.toFixed(2)} kg CO2e, showing a ` +
        `${carbonTrend.percentage_change.toFixed(1)}% ${direction} versus prior period. ` +
        "Keep working on optimizing utility drawer draws and swapping transport options!";
    }

    // 7. Save report
    const newReport = new Report({
      user_id: userId,
      report_type: reportTypeVal,
      start_date: startDate,
      end_date: endDate,
      carbon_trend: carbonTrend,
      predictions,
      achievements,
      suggestions,
      ai_summary: aiSummary,
      created_at: new Date()
    });

    const savedReport = await newReport.save();
    const reportObj = savedReport.toObject();

    // 8. Compile PDF and Send email if requested
    if (sendEmailVal && req.user.email) {
      try {
        const pdfBytes = await generateReportPdf(reportObj);
        await sendReportEmail(req.user.email, reportObj, pdfBytes);
      } catch (err) {
        console.error('Failed to compile PDF or dispatch report email:', err.message);
      }
    }

    reportObj._id = reportObj._id.toString();
    reportObj.user_id = reportObj.user_id.toString();
    reportObj.start_date = reportObj.start_date.toISOString();
    reportObj.end_date = reportObj.end_date.toISOString();
    reportObj.created_at = reportObj.created_at.toISOString();

    res.status(201).json(reportObj);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getReports = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const reports = await Report.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = reports.map(r => {
      const rObj = r.toObject();
      rObj._id = rObj._id.toString();
      rObj.user_id = rObj.user_id.toString();
      rObj.start_date = rObj.start_date.toISOString();
      rObj.end_date = rObj.end_date.toISOString();
      rObj.created_at = rObj.created_at.toISOString();
      return rObj;
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getReportDetail = async (req, res) => {
  try {
    const { report_id } = req.params;
    const userId = req.user._id;

    const report = await Report.findById(report_id);
    if (!report || report.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Report not found' });
    }

    const rObj = report.toObject();
    rObj._id = rObj._id.toString();
    rObj.user_id = rObj.user_id.toString();
    rObj.start_date = rObj.start_date.toISOString();
    rObj.end_date = rObj.end_date.toISOString();
    rObj.created_at = rObj.created_at.toISOString();

    res.json(rObj);
  } catch (error) {
    console.error('Get report detail error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const downloadReportPdf = async (req, res) => {
  try {
    const { report_id } = req.params;
    const userId = req.user._id;

    const report = await Report.findById(report_id);
    if (!report || report.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Report not found' });
    }

    const rObj = report.toObject();
    const pdfBytes = await generateReportPdf(rObj);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EcoPilot_Report_${rObj.report_type || 'sustainability'}.pdf"`);
    res.send(pdfBytes);
  } catch (error) {
    console.error('Download report PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
};

const deleteReport = async (req, res) => {
  try {
    const { report_id } = req.params;
    const userId = req.user._id;

    const report = await Report.findById(report_id);
    if (!report || report.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Report not found' });
    }

    await Report.deleteOne({ _id: report_id });
    res.json({ message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  generateReport,
  getReports,
  getReportDetail,
  downloadReportPdf,
  deleteReport
};
