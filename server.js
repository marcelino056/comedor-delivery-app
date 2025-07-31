const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/comedor_delivery';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Conectado a MongoDB');
})
.catch((error) => {
  console.error('❌ Error conectando a MongoDB:', error);
  process.exit(1);
});

// Esquemas de MongoDB
const ventaSchema = new mongoose.Schema({
  monto: { type: Number, required: true },
  metodoPago: { type: String, required: true },
  anulada: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const ordenSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  telefono: { type: String, required: true },
  direccion: { type: String, required: true },
  descripcion: { type: String, required: true },
  monto: { type: Number, required: true },
  costoDelivery: { type: Number, required: true },
  total: { type: Number, required: true },
  metodoPago: { type: String, required: true },
  estado: { 
    type: String, 
    required: true,
    enum: ['recibida', 'preparando', 'en-camino', 'entregada']
  },
  repartidor: { type: String, required: true },
  anulada: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const gastoSchema = new mongoose.Schema({
  concepto: { type: String, required: true },
  monto: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const montoInicialSchema = new mongoose.Schema({
  fecha: { type: String, required: true, unique: true },
  monto: { type: Number, required: true }
}, {
  timestamps: true
});

// Modelos
const Venta = mongoose.model('Venta', ventaSchema);
const Orden = mongoose.model('Orden', ordenSchema);
const Gasto = mongoose.model('Gasto', gastoSchema);
const MontoInicial = mongoose.model('MontoInicial', montoInicialSchema);

// WebSocket server para tiempo real
const wss = new WebSocket.Server({ port: 3006 });

const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// API Routes

// Obtener todas las ventas
app.get('/api/ventas', async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ timestamp: -1 });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva venta
app.post('/api/ventas', async (req, res) => {
  try {
    const { monto, metodoPago, timestamp } = req.body;
    
    const nuevaVenta = new Venta({
      monto,
      metodoPago,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
    const ventaGuardada = await nuevaVenta.save();
    
    // Broadcast via WebSocket
    broadcast({ 
      type: 'nueva_venta', 
      data: {
        id: ventaGuardada._id,
        monto: ventaGuardada.monto,
        metodoPago: ventaGuardada.metodoPago,
        anulada: ventaGuardada.anulada,
        timestamp: ventaGuardada.timestamp
      }
    });
    
    res.json({ id: ventaGuardada._id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anular venta
app.put('/api/ventas/:id/anular', async (req, res) => {
  try {
    const { id } = req.params;
    
    const venta = await Venta.findByIdAndUpdate(
      id, 
      { anulada: true }, 
      { new: true }
    );
    
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    broadcast({ type: 'venta_anulada', data: { id: venta._id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las órdenes
app.get('/api/ordenes', async (req, res) => {
  try {
    const ordenes = await Orden.find().sort({ timestamp: -1 });
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva orden
app.post('/api/ordenes', async (req, res) => {
  try {
    const { 
      cliente, telefono, direccion, descripcion, 
      monto, costoDelivery, total, metodoPago, 
      estado, repartidor, timestamp 
    } = req.body;
    
    const nuevaOrden = new Orden({
      cliente,
      telefono,
      direccion,
      descripcion,
      monto,
      costoDelivery,
      total,
      metodoPago,
      estado,
      repartidor,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
    const ordenGuardada = await nuevaOrden.save();
    
    broadcast({ 
      type: 'nueva_orden', 
      data: {
        id: ordenGuardada._id,
        cliente: ordenGuardada.cliente,
        telefono: ordenGuardada.telefono,
        direccion: ordenGuardada.direccion,
        descripcion: ordenGuardada.descripcion,
        monto: ordenGuardada.monto,
        costoDelivery: ordenGuardada.costoDelivery,
        total: ordenGuardada.total,
        metodoPago: ordenGuardada.metodoPago,
        estado: ordenGuardada.estado,
        repartidor: ordenGuardada.repartidor,
        anulada: ordenGuardada.anulada,
        timestamp: ordenGuardada.timestamp
      }
    });
    
    res.json({ id: ordenGuardada._id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado de orden
app.put('/api/ordenes/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const orden = await Orden.findByIdAndUpdate(
      id, 
      { estado }, 
      { new: true }
    );
    
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    broadcast({ type: 'orden_actualizada', data: { id: orden._id, estado } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar método de pago de orden
app.put('/api/ordenes/:id/metodoPago', async (req, res) => {
  try {
    const { id } = req.params;
    const { metodoPago } = req.body;
    
    const orden = await Orden.findByIdAndUpdate(
      id, 
      { metodoPago }, 
      { new: true }
    );
    
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    broadcast({ type: 'orden_actualizada', data: { id: orden._id, metodoPago } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anular orden
app.put('/api/ordenes/:id/anular', async (req, res) => {
  try {
    const { id } = req.params;
    
    const orden = await Orden.findByIdAndUpdate(
      id, 
      { anulada: true }, 
      { new: true }
    );
    
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    broadcast({ type: 'orden_anulada', data: { id: orden._id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los gastos
app.get('/api/gastos', async (req, res) => {
  try {
    const gastos = await Gasto.find().sort({ timestamp: -1 });
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo gasto
app.post('/api/gastos', async (req, res) => {
  try {
    const { concepto, monto, timestamp } = req.body;
    
    const nuevoGasto = new Gasto({
      concepto,
      monto,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
    const gastoGuardado = await nuevoGasto.save();
    
    broadcast({ 
      type: 'nuevo_gasto', 
      data: {
        id: gastoGuardado._id,
        concepto: gastoGuardado.concepto,
        monto: gastoGuardado.monto,
        timestamp: gastoGuardado.timestamp
      }
    });
    
    res.json({ id: gastoGuardado._id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener monto inicial por fecha
app.get('/api/monto-inicial/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    
    const montoDoc = await MontoInicial.findOne({ fecha });
    res.json({ monto: montoDoc ? montoDoc.monto : 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Establecer monto inicial
app.post('/api/monto-inicial', async (req, res) => {
  try {
    const { fecha, monto } = req.body;
    
    const montoDoc = await MontoInicial.findOneAndUpdate(
      { fecha },
      { monto },
      { upsert: true, new: true }
    );
    
    broadcast({ type: 'monto_inicial_actualizado', data: { fecha, monto } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint adicional para migración de datos (opcional)
app.post('/api/migrate-from-sqlite', async (req, res) => {
  try {
    const { ventas, ordenes, gastos, montosIniciales } = req.body;
    
    // Limpiar colecciones existentes
    await Promise.all([
      Venta.deleteMany({}),
      Orden.deleteMany({}),
      Gasto.deleteMany({}),
      MontoInicial.deleteMany({})
    ]);
    
    // Insertar datos migrados
    if (ventas && ventas.length > 0) {
      await Venta.insertMany(ventas);
    }
    if (ordenes && ordenes.length > 0) {
      await Orden.insertMany(ordenes);
    }
    if (gastos && gastos.length > 0) {
      await Gasto.insertMany(gastos);
    }
    if (montosIniciales && montosIniciales.length > 0) {
      await MontoInicial.insertMany(montosIniciales);
    }
    
    res.json({ success: true, message: 'Migración completada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servir la aplicación
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📱 Aplicación disponible en http://localhost:${PORT}`);
  console.log(`🔄 WebSocket servidor en puerto 3006`);
  console.log(`🍃 Base de datos: MongoDB (${MONGODB_URI})`);
});

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await mongoose.connection.close();
  console.log('✅ Conexión a MongoDB cerrada');
  process.exit(0);
});
