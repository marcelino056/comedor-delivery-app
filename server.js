
// ================== DEPENDENCIAS PRINCIPALES ==================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initWebSocket, broadcast } = require('./services/websocket');

// ================== CONEXIÓN BASE DE DATOS ==================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/comedor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ================== CONFIGURACIÓN EXPRESS ==================
const app = express();
app.use(cors());
app.use(express.json());

// ============= RUTA PARA REPORTE DIARIO (MVC) =============
const reporteRoutes = require('./routes/reporteRoutes');
app.use('/api/reporte', reporteRoutes);

// ============= RUTAS API PARA CLIENTES (MVC) =============
const clienteRoutes = require('./routes/clienteRoutes');
app.use('/api/clientes', clienteRoutes);

// ============= RUTAS API PARA CONFIGURACIÓN RNC (MVC) =============
const configuracionRNCRoutes = require('./routes/configuracionRNCRoutes');
app.use('/api/configuracion-rnc', configuracionRNCRoutes);

// ============= RUTAS API PARA CONDUCES (MVC) =============
const conduceRoutes = require('./routes/conduceRoutes');
app.use('/api/conduces', conduceRoutes);

// ============= RUTAS API PARA FACTURAS (MVC) =============
const facturaRoutes = require('./routes/facturaRoutes');
app.use('/api/facturas', facturaRoutes);

// ============= RUTAS API PARA VENTAS (MVC) =============
const ventaRoutes = require('./routes/ventaRoutes');
app.use('/api/ventas', ventaRoutes);

// ============= RUTA PARA MIGRACIÓN DE DATOS (MVC) =============
const migracionRoutes = require('./routes/migracionRoutes');
app.use('/api/migrate', migracionRoutes);


// Servir archivos estáticos (JS, CSS, manifest, icons, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Servir index.html para la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================== INICIAR SERVIDOR Y LOGS ==================
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/comedor';

const server = app.listen(PORT, () => {
  console.log('==============================================');
  console.log('🚀 Servidor Express iniciado');
  console.log(`🌎 Entorno: ${ENV}`);
  console.log(`🔗 API escuchando en: http://localhost:${PORT}`);
  console.log(`📦 Conectado a MongoDB: ${MONGO_URI}`);
  console.log('==============================================');
});

// Inicializar WebSocket
initWebSocket(server);
console.log('🟢 WebSocket Server inicializado');

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await mongoose.connection.close();
  console.log('✅ Conexión a MongoDB cerrada');
  process.exit(0);
});
