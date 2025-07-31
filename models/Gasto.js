// Modelo de Gasto para Mongoose
const mongoose = require('mongoose');

const gastoSchema = new mongoose.Schema({
  concepto: String,
  monto: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gasto', gastoSchema);
