const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');

// Conectar a MongoDB
const MONGODB_URI = 'mongodb://127.0.0.1:27017/comedor_delivery';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Esquemas de MongoDB (idénticos al server.js)
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

// Abrir base de datos SQLite
const db = new sqlite3.Database('./comedor.db');

async function migrarDatos() {
  try {
    console.log('🚀 Iniciando migración de SQLite a MongoDB...');

    // Limpiar colecciones existentes en MongoDB
    console.log('🧹 Limpiando colecciones existentes...');
    await Promise.all([
      Venta.deleteMany({}),
      Orden.deleteMany({}),
      Gasto.deleteMany({}),
      MontoInicial.deleteMany({})
    ]);

    // Migrar ventas
    console.log('📊 Migrando ventas...');
    const ventas = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM ventas', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (ventas.length > 0) {
      const ventasMongo = ventas.map(venta => ({
        monto: venta.monto,
        metodoPago: venta.metodoPago,
        anulada: Boolean(venta.anulada),
        timestamp: new Date(venta.timestamp)
      }));
      await Venta.insertMany(ventasMongo);
      console.log(`✅ ${ventas.length} ventas migradas`);
    }

    // Migrar órdenes
    console.log('📦 Migrando órdenes...');
    const ordenes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM ordenes', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (ordenes.length > 0) {
      const ordenesMongo = ordenes.map(orden => ({
        cliente: orden.cliente,
        telefono: orden.telefono,
        direccion: orden.direccion,
        descripcion: orden.descripcion,
        monto: orden.monto,
        costoDelivery: orden.costoDelivery,
        total: orden.total,
        metodoPago: orden.metodoPago,
        estado: orden.estado,
        repartidor: orden.repartidor,
        anulada: Boolean(orden.anulada),
        timestamp: new Date(orden.timestamp)
      }));
      await Orden.insertMany(ordenesMongo);
      console.log(`✅ ${ordenes.length} órdenes migradas`);
    }

    // Migrar gastos
    console.log('💸 Migrando gastos...');
    const gastos = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM gastos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (gastos.length > 0) {
      const gastosMongo = gastos.map(gasto => ({
        concepto: gasto.concepto,
        monto: gasto.monto,
        timestamp: new Date(gasto.timestamp)
      }));
      await Gasto.insertMany(gastosMongo);
      console.log(`✅ ${gastos.length} gastos migrados`);
    }

    // Migrar montos iniciales
    console.log('💰 Migrando montos iniciales...');
    const montosIniciales = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM montoInicial', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (montosIniciales.length > 0) {
      const montosMongo = montosIniciales.map(monto => ({
        fecha: monto.fecha,
        monto: monto.monto
      }));
      await MontoInicial.insertMany(montosMongo);
      console.log(`✅ ${montosIniciales.length} montos iniciales migrados`);
    }

    console.log('🎉 ¡Migración completada exitosamente!');

    // Verificar datos migrados
    const totalVentas = await Venta.countDocuments();
    const totalOrdenes = await Orden.countDocuments();
    const totalGastos = await Gasto.countDocuments();
    const totalMontos = await MontoInicial.countDocuments();

    console.log('\n📊 Resumen de migración:');
    console.log(`   Ventas: ${totalVentas}`);
    console.log(`   Órdenes: ${totalOrdenes}`);
    console.log(`   Gastos: ${totalGastos}`);
    console.log(`   Montos iniciales: ${totalMontos}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    db.close();
    await mongoose.connection.close();
    console.log('✅ Conexiones cerradas');
    process.exit(0);
  }
}

migrarDatos();
