
// ================== DEPENDENCIAS PRINCIPALES ==================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initWebSocket, broadcast } = require('./services/websocket');

// ================== CONEXIÓN BASE DE DATOS ==================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/comedor', {
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

// ============= RUTAS API PARA CONFIGURACIÓN EMPRESA (MVC) =============
const configuracionEmpresaRoutes = require('./routes/configuracionEmpresaRoutes');
app.use('/api/configuracion-empresa', configuracionEmpresaRoutes);

// ============= RUTAS API PARA CONDUCES (MVC) =============
const conduceRoutes = require('./routes/conduceRoutes');
app.use('/api/conduces', conduceRoutes);

// ============= RUTAS API PARA FACTURAS (MVC) =============
const facturaRoutes = require('./routes/facturaRoutes');
app.use('/api/facturas', facturaRoutes);

// ============= RUTAS API PARA VENTAS (MVC) =============
const ventaRoutes = require('./routes/ventaRoutes');
app.use('/api/ventas', ventaRoutes);

// ============= RUTAS API PARA ÓRDENES (MVC) =============
const ordenRoutes = require('./routes/ordenRoutes');
app.use('/api/ordenes', ordenRoutes);

// ============= RUTAS API PARA GASTOS (MVC) =============
const gastoRoutes = require('./routes/gastoRoutes');
app.use('/api/gastos', gastoRoutes);

// ============= RUTAS API PARA MONTO INICIAL (MVC) =============
const montoInicialRoutes = require('./routes/montoInicialRoutes');
app.use('/api/monto-inicial', montoInicialRoutes);

// ============= RUTA PARA MIGRACIÓN DE DATOS (MVC) =============
const migracionRoutes = require('./routes/migracionRoutes');
app.use('/api/migrate', migracionRoutes);

// ============= RUTAS PARA LIMPIEZA DE BASE DE DATOS (ADMIN) =============
const cleanRoutes = require('./routes/cleanRoutes');
app.use('/api/admin/clean', cleanRoutes);

// ============= ENDPOINT DE VERSIÓN =============
app.get('/api/version', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Leer archivo de versión si existe
    const versionPath = path.join(__dirname, 'public', 'version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = fs.readFileSync(versionPath, 'utf8');
      const version = JSON.parse(versionData);
      res.json(version);
    } else {
      // Versión por defecto basada en timestamp del servidor
      res.json({
        version: Date.now().toString(),
        deployDate: new Date().toISOString(),
        commit: 'unknown',
        branch: 'unknown',
        server: 'running'
      });
    }
  } catch (error) {
    console.error('Error obteniendo versión:', error);
    res.status(500).json({
      error: 'Error obteniendo versión',
      version: 'unknown'
    });
  }
});

// Servir archivos estáticos (JS, CSS, manifest, icons, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Servir index.html para la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================== INICIAR SERVIDOR Y LOGS ==================
const PORT = process.env.PORT || 3005;
const ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/comedor';

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
// Hacer broadcast global para los controladores
global.broadcast = broadcast;

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await mongoose.connection.close();
  console.log('✅ Conexión a MongoDB cerrada');
  process.exit(0);
});
