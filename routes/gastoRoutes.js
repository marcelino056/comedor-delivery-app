const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gastoController');

router.get('/', gastoController.getAll);
router.post('/', gastoController.create);

module.exports = router;
