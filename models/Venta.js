// Modelo de Venta para Mongoose (ventas de mostrador)
const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  numero: String,
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: false },
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
  estado: { type: String, default: 'pagada' },
  fecha: { type: Date, default: Date.now },
  metodoPago: { type: String, default: 'efectivo' },
  observaciones: String
});

module.exports = mongoose.model('Venta', ventaSchema);
