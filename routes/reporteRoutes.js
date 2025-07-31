const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');

router.get('/diario/:fecha', reporteController.diario);

module.exports = router;
