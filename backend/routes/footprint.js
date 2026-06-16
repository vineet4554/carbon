const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  logFootprint,
  getHistory,
  predictTrends,
  runLifestyleSimulation
} = require('../controllers/footprint');

const router = express.Router();

router.use(authMiddleware);

router.post('/log', logFootprint);
router.get('/history', getHistory);
router.get('/predict', predictTrends);
router.post('/simulate', runLifestyleSimulation);

module.exports = router;
