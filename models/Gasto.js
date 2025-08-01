// Modelo de Gasto para Mongoose
const mongoose = require('mongoose');

const gastoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  monto: { type: Number, required: true },
  categoria: { type: String, default: 'otros' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gasto', gastoSchema);
