const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { uploadBill, getBills } = require('../controllers/bill');

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.use(authMiddleware);

router.post('/upload', upload.single('file'), uploadBill);
router.get('/', getBills);

module.exports = router;
