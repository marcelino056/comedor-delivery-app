const express = require('express');
const router = express.Router();
const conduceController = require('../controllers/conduceController');



router.get('/', conduceController.getAll);
router.post('/', conduceController.create);
router.get('/:id/pdf', conduceController.pdf);
router.get('/pendientes/:clienteId', conduceController.pendientes);
router.put('/:id/anular', conduceController.anular);
router.delete('/:id', conduceController.delete);

module.exports = router;
