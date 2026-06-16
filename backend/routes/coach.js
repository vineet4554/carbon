const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getSessions,
  createSession,
  assessHabits,
  getSessionDetail,
  updateSession,
  deleteSession,
  streamCoachMessage,
  searchChatHistory
} = require('../controllers/coach');

const router = express.Router();

router.use(authMiddleware);

router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.post('/assess', assessHabits);
router.get('/sessions/:session_id', getSessionDetail);
router.put('/sessions/:session_id', updateSession);
router.delete('/sessions/:session_id', deleteSession);
router.post('/sessions/:session_id/message/stream', streamCoachMessage);
router.get('/search', searchChatHistory);

module.exports = router;
