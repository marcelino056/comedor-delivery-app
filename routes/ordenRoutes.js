const express = require('express');
const router = express.Router();
const ordenController = require('../controllers/ordenController');

// Rutas básicas CRUD
router.get('/', ordenController.getAll);
router.post('/', ordenController.create);
router.put('/:id', ordenController.update);
router.delete('/:id', ordenController.delete);

// Rutas específicas para ordenes
router.put('/:id/anular', ordenController.anular);
router.put('/:id/estado', ordenController.cambiarEstado);
router.put('/:id/metodoPago', ordenController.cambiarMetodoPago);

module.exports = router;
