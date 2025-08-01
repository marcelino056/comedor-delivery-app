// Modelo de Factura para Mongoose
const mongoose = require('mongoose');

const facturaSchema = new mongoose.Schema({
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
  estado: { type: String, default: 'pagada' },
  fechaEmision: { type: Date, default: Date.now },
  rnc: String,
  tipoComprobante: String
});

module.exports = mongoose.model('Factura', facturaSchema);
