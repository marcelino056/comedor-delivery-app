const mongoose = require('mongoose');

const configuracionEmpresaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    default: 'COMEDOR & DELIVERY'
  },
  direccion: {
    type: String,
    default: 'Tu Dirección Aquí'
  },
  telefono: {
    type: String,
    default: '(809) 123-4567'
  },
  rnc: {
    type: String,
    default: '123456789'
  },
  logo: {
    type: String, // Base64 o URL del logo
    default: null
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Solo permitir un documento de configuración
configuracionEmpresaSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('ConfiguracionEmpresa', configuracionEmpresaSchema);