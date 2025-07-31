// Modelo de Cliente para Mongoose
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: String,
  telefono: String,
  rnc: String,
  direccion: String,
  creditoHabilitado: { type: Boolean, default: false },
  limiteCredito: { type: Number, default: 0 },
  saldoPendiente: { type: Number, default: 0 },
  diasCredito: { type: Number, default: 30 },
  conduces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conduce' }]
});

module.exports = mongoose.model('Cliente', clienteSchema);
