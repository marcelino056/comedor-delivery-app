// Modelo de Configuración RNC para Mongoose
const mongoose = require('mongoose');

const configuracionRNCSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  prefijo: { type: String, required: true },
  secuenciaInicial: { type: Number, required: true },
  secuenciaFinal: { type: Number, required: true },
  secuenciaActual: { type: Number, default: function() { return this.secuenciaInicial; } },
  fechaVencimiento: Date,
  activa: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConfiguracionRNC', configuracionRNCSchema);
