const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { scanRoomImage, listRoomScans } = require('../controllers/room');

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authMiddleware);

router.post('/scan', upload.single('file'), scanRoomImage);
router.get('/scans', listRoomScans);

module.exports = router;
