const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');

router.get('/', ventaController.getAll);
router.post('/', ventaController.create);
router.post('/:id/anular', ventaController.anular);

module.exports = router;
