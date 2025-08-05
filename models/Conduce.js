// Modelo de Conduce para Mongoose
const mongoose = require('mongoose');
const { getLocalDate } = require('../utils/dateUtils');

const conduceSchema = new mongoose.Schema({
  numero: String,
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  productos: [
    {
      descripcion: String,
      cantidad: Number,
      precioUnitario: Number,
      total: Number
    }
  ],
  subtotal: Number,
  impuesto: Number,
  total: Number,
  esComprobanteFiscal: { type: Boolean, default: false },
  estado: { type: String, default: 'pendiente' },
  anulado: { type: Boolean, default: false },
  motivoAnulacion: String,
  fechaCreacion: { type: Date, default: getLocalDate },
  fechaVencimiento: Date
});

module.exports = mongoose.model('Conduce', conduceSchema);
