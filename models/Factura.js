// Modelo de Factura para Mongoose
const mongoose = require('mongoose');
const { getLocalDate } = require('../utils/dateUtils');

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
  fechaEmision: { type: Date, default: getLocalDate },
  rnc: String,
  tipoComprobante: String,
  
  // Campos adicionales para facturas de delivery
  ordenDeliveryId: { type: String }, // ID de la orden de delivery asociada
  clienteNombre: { type: String }, // Nombre directo del cliente (fallback)
  clienteTelefono: { type: String }, // Teléfono directo del cliente (fallback)
  clienteDireccion: { type: String }, // Dirección directa del cliente (fallback)
  
  // Campos para comprobantes fiscales
  esComprobanteFiscal: { type: Boolean, default: false },
  requiereRNC: { type: Boolean, default: false },
  metodoPago: { type: String, default: 'efectivo' }
});

module.exports = mongoose.model('Factura', facturaSchema);
