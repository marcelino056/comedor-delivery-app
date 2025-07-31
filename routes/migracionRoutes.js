const express = require('express');
const router = express.Router();
const migracionController = require('../controllers/migracionController');

router.post('/from-sqlite', migracionController.migrateFromSqlite);

module.exports = router;
