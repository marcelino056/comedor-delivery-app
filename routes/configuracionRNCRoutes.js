const express = require('express');
const router = express.Router();
const configuracionRNCController = require('../controllers/configuracionRNCController');

router.get('/', configuracionRNCController.getAll);
router.post('/', configuracionRNCController.create);
router.put('/:id', configuracionRNCController.update);

module.exports = router;
