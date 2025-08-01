const express = require('express');
const router = express.Router();
const configuracionEmpresaController = require('../controllers/configuracionEmpresaController');

// GET /api/configuracion-empresa - Obtener configuración
router.get('/', configuracionEmpresaController.get);

// PUT /api/configuracion-empresa - Actualizar configuración
router.put('/', configuracionEmpresaController.update);

module.exports = router;