const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getStats,
  getLeaderboardRoute,
  getChallenges,
  claimChallenge
} = require('../controllers/gamification');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', getStats);
router.get('/leaderboard', getLeaderboardRoute);
router.get('/challenges', getChallenges);
router.post('/challenges/:challenge_id/claim', claimChallenge);

module.exports = router;
