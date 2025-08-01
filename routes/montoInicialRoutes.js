const express = require('express');
const router = express.Router();
const montoInicialController = require('../controllers/montoInicialController');

router.get('/:fecha', montoInicialController.getByFecha);
router.post('/', montoInicialController.setMonto);

module.exports = router;
