const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { simulateCarbonTwin } = require('../controllers/twin');

const router = express.Router();

router.use(authMiddleware);

router.post('/simulate', simulateCarbonTwin);

module.exports = router;
