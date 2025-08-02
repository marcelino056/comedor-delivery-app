// Modelo de Orden para Mongoose
const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
  cliente: String,
  telefono: String,
  direccion: String,
  descripcion: String,
  monto: Number,
  costoDelivery: Number,
  total: Number,
  metodoPago: String,
  estado: { type: String, default: 'recibida' },
  repartidor: String,
  anulada: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  
  // Campos para control de facturación
  facturaId: { type: String }, // ID de la factura generada para esta orden
  numeroFactura: { type: String } // Número de la factura para referencia rápida
});

module.exports = mongoose.model('Orden', ordenSchema);
