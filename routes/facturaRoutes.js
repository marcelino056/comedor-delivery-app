
const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');

router.get('/', facturaController.getAll);
router.post('/', facturaController.create);

router.put('/:id/anular', facturaController.anular);
router.get('/:id/pdf', facturaController.pdf);
// Reporte mensual de facturas con RNC
router.get('/reporte-rnc', facturaController.reporteFacturasRNC);

module.exports = router;
