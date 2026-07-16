const PDFDocument = require('pdfkit');

const generateReportPdf = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 54, bottom: 54, left: 36, right: 36 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBytes = Buffer.concat(buffers);
        resolve(pdfBytes);
      });

      // Colors
      const primaryColor = '#10b981'; // Emerald Green
      const textDark = '#1e293b'; // Dark Slate
      const bgLight = '#f8fafc'; // slate-50
      const borderColor = '#e2e8f0'; // light border
      const aiBg = '#ecfdf5'; // Soft emerald tint
      const aiBorder = '#d1fae5';

      // --- HEADER SECTION ---
      const reportTypeStr = (reportData.report_type || 'monthly').charAt(0).toUpperCase() + (reportData.report_type || 'monthly').slice(1);
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(`EcoPilot AI - ${reportTypeStr} Sustainability Report`, { lineGap: 8 })
        .moveDown(0.2);

      // Metadata Block
      const startDate = new Date(reportData.start_date);
      const endDate = new Date(reportData.end_date);
      const createdAt = new Date(reportData.created_at || new Date());
      
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      const createdStr = createdAt.toISOString().slice(0, 16).replace('T', ' ');

      // Metadata Table/Box
      doc
        .rect(36, doc.y, 540, 40)
        .fillAndStroke(bgLight, borderColor)
        .fillColor(textDark)
        .font('Helvetica-Bold')
        .fontSize(9.5);

      const tableY = doc.y - 40;
      doc.text('Report Period:', 46, tableY + 14);
      doc.font('Helvetica').text(`${startStr} to ${endStr}`, 130, tableY + 14);

      doc.font('Helvetica-Bold').text('Generated On:', 310, tableY + 14);
      doc.font('Helvetica').text(createdStr, 395, tableY + 14);

      doc.moveDown(1.5);

      // --- AI EXECUTIVE SUMMARY ---
      doc
        .fillColor(textDark)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('🌱 AI Executive Summary')
        .moveDown(0.3);

      const summaryY = doc.y;
      const aiSummaryText = reportData.ai_summary || 'No AI analysis available for this period.';
      
      // Calculate heights and draw custom sidebar
      doc.font('Helvetica-Oblique').fontSize(9.5);
      const textHeight = doc.heightOfString(aiSummaryText, { width: 520, lineGap: 4 });
      const rectHeight = textHeight + 20;

      // Draw box background
      doc
        .rect(36, summaryY, 540, rectHeight)
        .fillAndStroke(aiBg, aiBorder);

      // Draw accent left line
      doc
        .rect(36, summaryY, 3, rectHeight)
        .fill(primaryColor);

      // Draw text
      doc
        .fillColor('#334155')
        .text(aiSummaryText, 46, summaryY + 10, { width: 520, lineGap: 4 });

      doc.y = summaryY + rectHeight;
      doc.moveDown(1.2);

      // --- CARBON PERFORMANCE TRENDS ---
      doc
        .fillColor(textDark)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('📊 Carbon Emissions Trend')
        .moveDown(0.3);

      const trend = reportData.carbon_trend || {};
      const totalCo2 = trend.total_co2_kg || 0.0;
      const prevCo2 = trend.previous_co2_kg || 0.0;
      const pctChange = trend.percentage_change || 0.0;
      const direction = trend.direction || 'stable';

      let dirText = 'remained stable ➡️';
      if (direction === 'up') dirText = 'increased 🔺';
      else if (direction === 'down' || direction === 'decrease') dirText = 'decreased 🔻';

      const trendDescription = 
        `Your total footprint for this period was ${totalCo2.toFixed(2)} kg CO2e. ` +
        `Compared to the prior period (${prevCo2.toFixed(2)} kg CO2e), your emissions have ${dirText} ` +
        `by ${pctChange.toFixed(1)}%.`;

      doc
        .fillColor(textDark)
        .font('Helvetica')
        .fontSize(9.5)
        .text(trendDescription, { lineGap: 3 })
        .moveDown(1.2);

      // --- FUTURE EMISSIONS FORECAST ---
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('🔮 3-Month Emissions Forecast')
        .moveDown(0.3);

      const predictions = reportData.predictions || [];

      // Draw Table Header
      let forecastY = doc.y;
      doc
        .rect(36, forecastY, 540, 20)
        .fill(primaryColor)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9.5);
      
      doc.text('Month', 130, forecastY + 6);
      doc.text('Forecasted Carbon (kg CO2e)', 380, forecastY + 6);

      forecastY += 20;

      // Draw Table Rows
      predictions.forEach((pred, idx) => {
        doc
          .rect(36, forecastY, 540, 20)
          .fillAndStroke(bgLight, borderColor)
          .fillColor(textDark)
          .font('Helvetica');

        doc.text(pred.date || '', 130, forecastY + 6);
        doc.text(`${(pred.co2_kg || 0.0).toFixed(2)} kg`, 380, forecastY + 6);

        forecastY += 20;
      });

      doc.y = forecastY;
      doc.moveDown(1.2);

      // --- ACHIEVEMENTS & ECO ENGAGEMENT ---
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('🏆 Achievements & Engagement')
        .moveDown(0.3);

      const ach = reportData.achievements || {};
      const xp = ach.xp_earned || 0;
      const badges = ach.badges_unlocked || [];
      const badgesStr = badges.length > 0 ? badges.join(', ') : 'None';

      let achY = doc.y;
      
      // Row 1: XP
      doc
        .rect(36, achY, 540, 20)
        .fillAndStroke(bgLight, borderColor)
        .fillColor(textDark)
        .font('Helvetica-Bold');
      doc.text('XP Points Earned:', 46, achY + 6);
      doc.font('Helvetica').text(`+${xp} XP`, 180, achY + 6);
      achY += 20;

      // Row 2: Badges
      doc
        .rect(36, achY, 540, 20)
        .fillAndStroke(bgLight, borderColor)
        .fillColor(textDark)
        .font('Helvetica-Bold');
      doc.text('Badges Unlocked:', 46, achY + 6);
      doc.font('Helvetica').text(badgesStr, 180, achY + 6);
      achY += 20;

      doc.y = achY;
      doc.moveDown(1.2);

      // --- RECOMMENDED ECO-STEPS ---
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('💡 Personalized Recommendations')
        .moveDown(0.3);

      const suggestions = reportData.suggestions || [];
      let sugY = doc.y;

      // Header
      doc
        .rect(36, sugY, 540, 20)
        .fill('#334155')
        .fillColor('#ffffff')
        .font('Helvetica-Bold');
      
      doc.text('Category', 46, sugY + 6);
      doc.text('Eco Action Recommendation', 130, sugY + 6);
      doc.text('Difficulty', 410, sugY + 6);
      doc.text('CO2 Reduction', 475, sugY + 6);

      sugY += 20;

      // Rows
      suggestions.forEach((sug) => {
        doc
          .rect(36, sugY, 540, 24)
          .fillAndStroke(bgLight, borderColor)
          .fillColor(textDark)
          .font('Helvetica');

        const cat = (sug.category || '').charAt(0).toUpperCase() + (sug.category || '').slice(1);
        doc.text(cat, 46, sugY + 8);
        doc.text(sug.recommendation || '', 130, sugY + 8, { width: 270, height: 16, ellipsis: true });
        doc.text(sug.difficulty || 'Easy', 410, sugY + 8);
        doc.text(sug.co2_reduction || '', 475, sugY + 8);

        sugY += 24;
      });

      // Footer Callback (runs on build end)
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Draw footer line
        doc
          .moveTo(36, 730)
          .lineTo(576, 730)
          .stroke('#e2e8f0');

        doc
          .fillColor('#64748b')
          .font('Helvetica')
          .fontSize(8);
        
        doc.text('EcoPilot AI Sustainability Performance Report', 36, 740);
        doc.text(`Page ${i + 1}`, 540, 740);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateReportPdf
};
