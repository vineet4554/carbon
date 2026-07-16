const nodemailer = require('nodemailer');

const sendReportEmail = async (userEmail, reportData, pdfBytes = null) => {
  const reportType = (reportData.report_type || 'monthly').charAt(0).toUpperCase() + (reportData.report_type || 'monthly').slice(1);
  const subject = `EcoPilot AI - Your ${reportType} Sustainability Report`;

  const trend = reportData.carbon_trend || {};
  const totalCo2 = trend.total_co2_kg || 0.0;
  const pctChange = trend.percentage_change || 0.0;
  const direction = trend.direction || 'stable';

  const dirText = direction === 'up' ? 'increased 📈' : direction === 'down' || direction === 'decrease' ? 'decreased 📉' : 'remained stable ➡️';
  const aiSummaryHtml = (reportData.ai_summary || 'No AI analysis available.').replace(/\n/g, '<br/>');

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #10b981; color: white; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
          <h2 style="margin: 0;">EcoPilot AI Sustainability Performance</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p>Here is your weekly/monthly executive carbon footprint report compiled by EcoPilot AI.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #10b981;">🌱 AI Summary Review</h3>
            <p style="font-style: italic; color: #475569;">${aiSummaryHtml}</p>
          </div>
          
          <h3>📊 Performance Metrics</h3>
          <ul>
            <li><b>Total Footprint:</b> ${totalCo2.toFixed(2)} kg CO2e</li>
            <li><b>Trend compared to prior period:</b> ${dirText} by ${pctChange.toFixed(1)}%</li>
          </ul>
          
          <p>Please find the attached PDF report for a full detailed breakdown of recommendations, achievements, and future predictions.</p>
          <br/>
          <p>Best regards,<br/><b>EcoPilot AI Team</b></p>
        </div>
        <div style="background-color: #f1f5f9; padding: 10px; text-align: center; font-size: 11px; color: #64748b; border-radius: 0 0 6px 6px;">
          Powered by EcoPilot Sustainability Engine. You received this because you are registered with EcoPilot.
        </div>
      </body>
    </html>
  `;

  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
  const emailUser = process.env.EMAIL_USER || 'user@example.com';
  const emailPass = process.env.EMAIL_PASSWORD || 'password';

  const isDummy = 
    emailUser === 'user@example.com' ||
    emailPass === 'password' ||
    (emailHost === 'smtp.gmail.com' && emailUser === 'user@example.com');

  if (isDummy) {
    console.warn('SMTP configuration is using default/dummy values. Falling back to log-based simulation.');
    console.log('================== EMAIL SIMULATION LOG ==================');
    console.log(`TO: ${userEmail}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${htmlContent}`);
    if (pdfBytes) {
      console.log(`ATTACHMENT: report_${reportData._id || 'new'}.pdf (${pdfBytes.length} bytes)`);
    }
    console.log('==========================================================');
    return true;
  }

  try {
    console.log(`Sending real report email via ${emailHost}:${emailPort} to ${userEmail}...`);

    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: emailUser,
      to: userEmail,
      subject: subject,
      html: htmlContent,
      attachments: pdfBytes ? [
        {
          filename: `EcoPilot_Report_${reportType}.pdf`,
          content: pdfBytes
        }
      ] : []
    };

    await transporter.sendMail(mailOptions);
    console.log(`Successfully sent report email to ${userEmail}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send report email via SMTP: ${error.message}. Falling back to simulation logs.`);
    console.log('================== EMAIL FALLBACK LOG ==================');
    console.log(`TO: ${userEmail}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${htmlContent}`);
    console.log('=========================================================');
    return false;
  }
};

module.exports = {
  sendReportEmail
};
