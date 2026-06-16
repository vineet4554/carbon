const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  generateReport,
  getReports,
  getReportDetail,
  downloadReportPdf,
  deleteReport
} = require('../controllers/report');

const router = express.Router();

router.use(authMiddleware);

router.post('/generate', generateReport);
router.get('/', getReports);
router.get('/:report_id', getReportDetail);
router.get('/:report_id/pdf', downloadReportPdf);
router.delete('/:report_id', deleteReport);

module.exports = router;
