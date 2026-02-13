const express = require('express');
const multer = require('multer');
const path = require('path');
const sttController = require('../controllers/sttController');

const router = express.Router();

// store uploads in server uploads folder
const uploadDir = path.join(__dirname, '../uploads');
const upload = multer({ dest: uploadDir });

// POST /api/stt - accepts multipart form audio file under 'audio' or 'file'
router.post('/', upload.single('audio'), sttController.transcribe);

module.exports = router;
