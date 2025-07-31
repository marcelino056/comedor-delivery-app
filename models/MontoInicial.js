// Modelo de Monto Inicial para Mongoose
const mongoose = require('mongoose');

const montoInicialSchema = new mongoose.Schema({
  fecha: { type: String, unique: true },
  monto: Number
});

module.exports = mongoose.model('MontoInicial', montoInicialSchema);
