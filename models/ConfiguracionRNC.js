// Modelo de Configuración RNC para Mongoose
const mongoose = require('mongoose');

const configuracionRNCSchema = new mongoose.Schema({
  rnc: { type: String, required: true },
  razonSocial: { type: String, required: true },
  direccion: String,
  telefono: String,
  secuencia: { type: Number, default: 1 },
  tipoComprobante: { type: String, default: 'FACTURA' },
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConfiguracionRNC', configuracionRNCSchema);
