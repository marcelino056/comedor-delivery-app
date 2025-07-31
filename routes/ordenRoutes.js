const express = require('express');
const router = express.Router();
const ordenController = require('../controllers/ordenController');

router.get('/', ordenController.getAll);
router.post('/', ordenController.create);
router.put('/:id', ordenController.update);
router.delete('/:id', ordenController.delete);

module.exports = router;
