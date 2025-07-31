const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');
const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');

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
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
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

// Esquema de Clientes
const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  telefono: { type: String, required: true },
  rnc: { type: String, default: '' },
  direccion: { type: String, default: '' },
  email: { type: String, default: '' },
  activo: { type: Boolean, default: true },
  // Información de crédito
  creditoHabilitado: { type: Boolean, default: false },
  limiteCredito: { type: Number, default: 0 },
  diasCredito: { type: Number, default: 30 }, // Días para pagar
  saldoPendiente: { type: Number, default: 0 } // Calculado automáticamente
}, {
  timestamps: true
});

// Esquema de Productos para facturas
const productoFacturaSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  total: { type: Number, required: true }
});

// Esquema de Facturas
const facturaSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  tipoComprobante: { type: String, required: true, enum: ['FACTURA', 'BOLETA'] },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  productos: [productoFacturaSchema],
  subtotal: { type: Number, required: true },
  impuesto: { type: Number, required: true }, // 18%
  total: { type: Number, required: true },
  fechaEmision: { type: Date, default: Date.now },
  rnc: { type: String, default: '' },
  secuencia: { type: String, default: '' },
  anulada: { type: Boolean, default: false },
  motivoAnulacion: { type: String, default: '' },
  conduces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conduce' }]
}, {
  timestamps: true
});

// Esquema de Configuración RNC
const configuracionRNCSchema = new mongoose.Schema({
  nombre: { type: String, required: true }, // Ej: "B01", "B02", etc.
  descripcion: { type: String, required: true },
  prefijo: { type: String, required: true }, // Ej: "B01"
  secuenciaInicial: { type: Number, required: true },
  secuenciaFinal: { type: Number, required: true },
  secuenciaActual: { type: Number, required: true },
  activa: { type: Boolean, default: true },
  fechaVencimiento: { type: Date, required: true }
}, {
  timestamps: true
});

// Esquema de Conduces (Documentos de Crédito)
const conduceSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  productos: [productoFacturaSchema],
  subtotal: { type: Number, required: true },
  impuesto: { type: Number, required: true }, // 18%
  total: { type: Number, required: true },
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date, required: true },
  estado: { 
    type: String, 
    required: true, 
    enum: ['pendiente', 'pagado', 'vencido', 'anulado'],
    default: 'pendiente'
  },
  facturaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Factura' }, // Cuando se paga
  observaciones: { type: String, default: '' },
  anulado: { type: Boolean, default: false },
  motivoAnulacion: { type: String, default: '' }
}, {
  timestamps: true
});

// Modelos
const Venta = mongoose.model('Venta', ventaSchema);
const Orden = mongoose.model('Orden', ordenSchema);
const Gasto = mongoose.model('Gasto', gastoSchema);
const MontoInicial = mongoose.model('MontoInicial', montoInicialSchema);
const Cliente = mongoose.model('Cliente', clienteSchema);
const Factura = mongoose.model('Factura', facturaSchema);
const ConfiguracionRNC = mongoose.model('ConfiguracionRNC', configuracionRNCSchema);
const Conduce = mongoose.model('Conduce', conduceSchema);

// WebSocket server para tiempo real
const wss = new WebSocket.Server({ port: 3007 });

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
    let query = {};
    
    // Si se proporciona una fecha, filtrar por esa fecha
    if (req.query.fecha) {
      const fecha = new Date(req.query.fecha);
      const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
      
      query.timestamp = {
        $gte: inicioDia,
        $lt: finDia
      };
    }
    
    const ventas = await Venta.find(query).sort({ timestamp: -1 });
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
    let query = {};
    
    // Si se proporciona una fecha, filtrar por esa fecha
    if (req.query.fecha) {
      const fecha = new Date(req.query.fecha);
      const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
      
      query.timestamp = {
        $gte: inicioDia,
        $lt: finDia
      };
    }
    
    const ordenes = await Orden.find(query).sort({ timestamp: -1 });
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
    let query = {};
    
    // Si se proporciona una fecha, filtrar por esa fecha
    if (req.query.fecha) {
      const fecha = new Date(req.query.fecha);
      const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
      
      query.timestamp = {
        $gte: inicioDia,
        $lt: finDia
      };
    }
    
    const gastos = await Gasto.find(query).sort({ timestamp: -1 });
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

// Generar reporte diario en PDF
app.get('/api/reporte-diario/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    
    // Crear fechas usando UTC para evitar problemas de zona horaria
    const fechaInicio = new Date(fecha + 'T00:00:00.000Z');
    const fechaFin = new Date(fecha + 'T23:59:59.999Z');

    console.log('=== DEBUG REPORTE ===');
    console.log('Fecha solicitada:', fecha);
    console.log('Rango de búsqueda UTC:', fechaInicio.toISOString(), 'a', fechaFin.toISOString());

    // Obtener datos del día
    const [ventas, ordenes, gastos, montoInicialDoc] = await Promise.all([
      Venta.find({
        timestamp: { $gte: fechaInicio, $lte: fechaFin },
        anulada: false
      }).sort({ timestamp: 1 }),
      Orden.find({
        timestamp: { $gte: fechaInicio, $lte: fechaFin },
        anulada: false
      }).sort({ timestamp: 1 }),
      Gasto.find({
        timestamp: { $gte: fechaInicio, $lte: fechaFin }
      }).sort({ timestamp: 1 }),
      MontoInicial.findOne({ fecha })
    ]);

    console.log('Ventas encontradas:', ventas.length, ventas.map(v => ({ monto: v.monto, metodoPago: v.metodoPago, timestamp: v.timestamp })));
    console.log('Órdenes encontradas:', ordenes.length);
    console.log('Gastos encontrados:', gastos.length);

    const montoInicial = montoInicialDoc ? montoInicialDoc.monto : 0;

    // Calcular totales
    const totalVentasLocal = ventas.reduce((sum, venta) => sum + venta.monto, 0);
    const totalVentasDelivery = ordenes.reduce((sum, orden) => sum + orden.total, 0);
    const totalVentas = totalVentasLocal + totalVentasDelivery;
    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
    const totalTransacciones = ventas.length + ordenes.length;

    // Calcular ventas por método de pago
    const ventasEfectivo = ventas
      .filter(item => item.metodoPago === 'efectivo')
      .reduce((sum, item) => sum + item.monto, 0) +
      ordenes
      .filter(item => item.metodoPago === 'efectivo')
      .reduce((sum, item) => sum + item.total, 0);
    
    const ventasTarjeta = ventas
      .filter(item => item.metodoPago === 'tarjeta')
      .reduce((sum, item) => sum + item.monto, 0) +
      ordenes
      .filter(item => item.metodoPago === 'tarjeta')
      .reduce((sum, item) => sum + item.total, 0);
    
    const ventasTransferencia = ventas
      .filter(item => item.metodoPago === 'transferencia')
      .reduce((sum, item) => sum + item.monto, 0) +
      ordenes
      .filter(item => item.metodoPago === 'transferencia')
      .reduce((sum, item) => sum + item.total, 0);

    const efectivoEsperado = montoInicial + ventasEfectivo - totalGastos;
    const ganancia = totalVentas - totalGastos;

    console.log('=== CÁLCULOS ===');
    console.log('Monto inicial:', montoInicial);
    console.log('Total ventas local:', totalVentasLocal);
    console.log('Total ventas delivery:', totalVentasDelivery);
    console.log('Total ventas:', totalVentas);
    console.log('Ventas efectivo:', ventasEfectivo);
    console.log('Ventas tarjeta:', ventasTarjeta);
    console.log('Total gastos:', totalGastos);
    console.log('Ganancia:', ganancia);

    // Crear objeto de fecha para el formato de display
    const fechaObj = new Date(fecha + 'T12:00:00.000Z'); // Mediodía UTC para evitar problemas de zona horaria

    // Generar HTML para el PDF
    const htmlContent = generateReportHTML({
      fecha: fechaObj.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      montoInicial,
      totalVentas,
      totalGastos,
      totalTransacciones,
      ganancia,
      ventasEfectivo,
      ventasTarjeta,
      ventasTransferencia,
      efectivoEsperado,
      ventas,
      ordenes,
      gastos,
      ventasLocales: ventas.length,
      delivery: ordenes.length
    });

    // Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();

    // Enviar PDF
    const fechaFileName = fecha.replace(/-/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-diario-${fechaFileName}.pdf"`);
    res.send(pdf);

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: error.message });
  }
});

function generateReportHTML(data) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte Diario - ${data.fecha}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 10px;
          color: #333;
          line-height: 1.2;
          font-size: 11px;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
        }
        .header h1 {
          color: #1e40af;
          margin: 0;
          font-size: 18px;
        }
        .header p {
          color: #6b7280;
          margin: 1px 0;
          font-size: 10px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-bottom: 10px;
        }
        .summary-card {
          padding: 6px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .summary-card.blue { background: #dbeafe; }
        .summary-card.green { background: #d1fae5; }
        .summary-card.red { background: #fee2e2; }
        .summary-card.purple { background: #e0e7ff; }
        .summary-label {
          font-size: 9px;
          color: #6b7280;
          margin: 0;
          font-weight: bold;
        }
        .summary-value {
          font-size: 12px;
          font-weight: bold;
          margin: 1px 0;
          color: #1f2937;
        }
        .summary-detail {
          font-size: 8px;
          color: #9ca3af;
          margin: 0;
        }
        .section {
          margin-bottom: 8px;
          background: white;
          border-radius: 4px;
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        .section h3 {
          color: #1e40af;
          margin: 0 0 6px 0;
          font-size: 12px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 3px;
        }
        .payment-method {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 6px;
          margin: 2px 0;
          border-radius: 3px;
          border-left: 2px solid #2563eb;
          background: #f9fafb;
        }
        .method-label {
          font-weight: bold;
          font-size: 10px;
        }
        .method-total {
          font-size: 10px;
          font-weight: bold;
          color: #059669;
        }
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
        }
        .transactions-table th,
        .transactions-table td {
          padding: 2px 4px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          font-size: 9px;
        }
        .transactions-table th {
          background-color: #f9fafb;
          font-weight: bold;
          color: #374151;
        }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
          padding: 2px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 9px;
        }
        .detail-row:last-child {
          border-bottom: none;
          font-weight: bold;
          border-top: 1px solid #e5e7eb;
          margin-top: 5px;
        }
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>COMEDOR DELIVERY</h1>
        <p><strong>Reporte Diario de Ventas</strong></p>
        <p>${data.fecha}</p>
        <p>Generado el ${new Date().toLocaleString('es-CO')}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card blue">
          <p class="summary-label">Monto Inicial</p>
          <p class="summary-value">${formatCurrency(data.montoInicial)}</p>
        </div>
        <div class="summary-card green">
          <p class="summary-label">Ventas Totales</p>
          <p class="summary-value">${formatCurrency(data.totalVentas)}</p>
          <p class="summary-detail">${data.totalTransacciones} transacciones</p>
        </div>
        <div class="summary-card red">
          <p class="summary-label">Gastos</p>
          <p class="summary-value">${formatCurrency(data.totalGastos)}</p>
        </div>
        <div class="summary-card purple">
          <p class="summary-label">Ganancia Neta</p>
          <p class="summary-value">${formatCurrency(data.ganancia)}</p>
        </div>
      </div>

      <div class="two-column">
        <div class="section">
          <h3>Resumen por Método de Pago</h3>
          <div class="payment-method">
            <span class="method-label">EFECTIVO</span>
            <span class="method-total">${formatCurrency(data.ventasEfectivo)}</span>
          </div>
          <div class="detail-row">
            <span>Monto inicial:</span>
            <span>${formatCurrency(data.montoInicial)}</span>
          </div>
          <div class="detail-row">
            <span>+ Ventas efectivo:</span>
            <span class="positive">+${formatCurrency(data.ventasEfectivo)}</span>
          </div>
          <div class="detail-row">
            <span>- Gastos:</span>
            <span class="negative">-${formatCurrency(data.totalGastos)}</span>
          </div>
          <div class="detail-row">
            <span><strong>Efectivo esperado:</strong></span>
            <span><strong>${formatCurrency(data.efectivoEsperado)}</strong></span>
          </div>

          <div class="payment-method" style="margin-top: 10px;">
            <span class="method-label">TARJETA</span>
            <span class="method-total">${formatCurrency(data.ventasTarjeta)}</span>
          </div>

          <div class="payment-method">
            <span class="method-label">TRANSFERENCIAS</span>
            <span class="method-total">${formatCurrency(data.ventasTransferencia)}</span>
          </div>
        </div>

        <div class="section">
          <h3>Resumen de Operaciones</h3>
          <p><strong>Ventas Locales:</strong> ${data.ventasLocales} | <strong>Delivery:</strong> ${data.delivery}</p>
          
          ${data.ventas.length > 0 ? `
          <h4 style="margin: 5px 0 3px 0; font-size: 10px;">Ventas Locales (${data.ventas.length})</h4>
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Monto</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              ${data.ventas.slice(0, 5).map(venta => `
                <tr>
                  <td>${formatDateTime(venta.timestamp)}</td>
                  <td>${formatCurrency(venta.monto)}</td>
                  <td>${venta.metodoPago.charAt(0).toUpperCase() + venta.metodoPago.slice(1)}</td>
                </tr>
              `).join('')}
              ${data.ventas.length > 5 ? `<tr><td colspan="3" style="text-align: center; font-style: italic;">... y ${data.ventas.length - 5} más</td></tr>` : ''}
            </tbody>
          </table>
          ` : ''}

          ${data.ordenes.length > 0 ? `
          <h4 style="margin: 5px 0 3px 0; font-size: 10px;">Órdenes Delivery (${data.ordenes.length})</h4>
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              ${data.ordenes.slice(0, 4).map(orden => `
                <tr>
                  <td>${formatDateTime(orden.timestamp)}</td>
                  <td>${orden.cliente}</td>
                  <td>${formatCurrency(orden.total)}</td>
                  <td>${orden.metodoPago.charAt(0).toUpperCase() + orden.metodoPago.slice(1)}</td>
                </tr>
              `).join('')}
              ${data.ordenes.length > 4 ? `<tr><td colspan="4" style="text-align: center; font-style: italic;">... y ${data.ordenes.length - 4} más</td></tr>` : ''}
            </tbody>
          </table>
          ` : ''}
        </div>
      </div>

      ${data.gastos.length > 0 ? `
      <div class="section">
        <h3>Gastos del Día (${data.gastos.length})</h3>
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Concepto</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            ${data.gastos.slice(0, 6).map(gasto => `
              <tr>
                <td>${formatDateTime(gasto.timestamp)}</td>
                <td>${gasto.concepto}</td>
                <td class="negative">${formatCurrency(gasto.monto)}</td>
              </tr>
            `).join('')}
            ${data.gastos.length > 6 ? `<tr><td colspan="3" style="text-align: center; font-style: italic;">... y ${data.gastos.length - 6} más</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p>Reporte generado automáticamente por el Sistema de Comedor Delivery</p>
      </div>
    </body>
    </html>
  `;
}

// ============= RUTAS API PARA CLIENTES =============

// Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find({ activo: true }).sort({ nombre: 1 });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desactivar cliente
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await Cliente.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= RUTAS API PARA CONFIGURACIÓN RNC =============

// Obtener configuraciones RNC
app.get('/api/configuracion-rnc', async (req, res) => {
  try {
    const configuraciones = await ConfiguracionRNC.find().sort({ nombre: 1 });
    res.json(configuraciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear configuración RNC
app.post('/api/configuracion-rnc', async (req, res) => {
  try {
    const config = new ConfiguracionRNC({
      ...req.body,
      secuenciaActual: req.body.secuenciaInicial
    });
    await config.save();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración RNC
app.put('/api/configuracion-rnc/:id', async (req, res) => {
  try {
    const config = await ConfiguracionRNC.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= RUTAS API PARA CONDUCES =============

// Obtener conduces con filtros
app.get('/api/conduces', async (req, res) => {
  try {
    const { fecha, cliente, estado } = req.query;
    let query = {};
    
    if (fecha) {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);
      query.fechaEmision = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (cliente) query.cliente = cliente;
    if (estado) query.estado = estado;
    
    const conduces = await Conduce.find(query)
      .populate('cliente', 'nombre telefono rnc')
      .sort({ fechaEmision: -1 });
    
    res.json(conduces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear conduce
app.post('/api/conduces', async (req, res) => {
  try {
    const { clienteId, productos, diasVencimiento } = req.body;
    
    // Verificar que el cliente tenga crédito habilitado
    const cliente = await Cliente.findById(clienteId);
    if (!cliente.creditoHabilitado) {
      return res.status(400).json({ error: 'Cliente no tiene crédito habilitado' });
    }
    
    // Calcular totales
    let subtotal = 0;
    productos.forEach(producto => {
      producto.total = producto.cantidad * producto.precioUnitario;
      subtotal += producto.total;
    });
    
    const impuesto = subtotal * 0.18;
    const total = subtotal + impuesto;
    
    // Verificar límite de crédito
    const nuevoSaldo = cliente.saldoPendiente + total;
    if (nuevoSaldo > cliente.limiteCredito) {
      return res.status(400).json({ 
        error: `Límite de crédito excedido. Disponible: $${(cliente.limiteCredito - cliente.saldoPendiente).toFixed(2)}` 
      });
    }
    
    // Generar número de conduce
    const count = await Conduce.countDocuments();
    const numeroConduce = `CON-${(count + 1).toString().padStart(6, '0')}`;
    
    // Calcular fecha de vencimiento
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + (diasVencimiento || cliente.diasCredito));
    
    const conduce = new Conduce({
      numero: numeroConduce,
      cliente: clienteId,
      productos,
      subtotal,
      impuesto,
      total,
      fechaVencimiento
    });
    
    await conduce.save();
    
    // Actualizar saldo del cliente
    cliente.saldoPendiente = nuevoSaldo;
    await cliente.save();
    
    await conduce.populate('cliente', 'nombre telefono rnc direccion');
    
    res.json(conduce);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar PDF de conduce
app.get('/api/conduces/:id/pdf', async (req, res) => {
  try {
    const conduce = await Conduce.findById(req.params.id).populate('cliente');
    
    if (!conduce) {
      return res.status(404).json({ error: 'Conduce no encontrado' });
    }
    
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="conduce-${conduce.numero}.pdf"`);
    
    // Pipe PDF al response
    doc.pipe(res);
    
    // Header de la empresa
    doc.fontSize(20).text('COMEDOR & DELIVERY', 50, 50);
    doc.fontSize(12).text('Sistema de Facturación', 50, 75);
    doc.text('RNC: 123456789', 50, 90);
    doc.text('Dirección: Tu Dirección Aquí', 50, 105);
    doc.text('Teléfono: (809) 123-4567', 50, 120);
    
    // Información del conduce
    doc.fontSize(16).text('CONDUCE DE CRÉDITO', 400, 50);
    doc.fontSize(12).text(`No: ${conduce.numero}`, 400, 75);
    doc.text(`Fecha: ${conduce.fechaEmision.toLocaleDateString('es-DO')}`, 400, 90);
    doc.text(`Vence: ${conduce.fechaVencimiento.toLocaleDateString('es-DO')}`, 400, 105);
    doc.text(`Estado: ${conduce.estado.toUpperCase()}`, 400, 120);
    
    // Información del cliente
    doc.text('ENTREGAR A:', 50, 160);
    doc.text(`Cliente: ${conduce.cliente.nombre}`, 50, 180);
    doc.text(`Teléfono: ${conduce.cliente.telefono}`, 50, 195);
    if (conduce.cliente.rnc) {
      doc.text(`RNC: ${conduce.cliente.rnc}`, 50, 210);
    }
    if (conduce.cliente.direccion) {
      doc.text(`Dirección: ${conduce.cliente.direccion}`, 50, 225);
    }
    
    // Tabla de productos
    let yPosition = 260;
    doc.text('DESCRIPCIÓN', 50, yPosition);
    doc.text('CANT.', 300, yPosition);
    doc.text('PRECIO', 360, yPosition);
    doc.text('TOTAL', 450, yPosition);
    
    // Línea separadora
    doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
    yPosition += 30;
    
    conduce.productos.forEach(producto => {
      doc.text(producto.descripcion, 50, yPosition);
      doc.text(producto.cantidad.toString(), 300, yPosition);
      doc.text(`$${producto.precioUnitario.toFixed(2)}`, 360, yPosition);
      doc.text(`$${producto.total.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
    });
    
    // Línea separadora
    yPosition += 10;
    doc.moveTo(300, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 20;
    
    // Totales
    doc.text('Subtotal:', 360, yPosition);
    doc.text(`$${conduce.subtotal.toFixed(2)}`, 450, yPosition);
    yPosition += 20;
    
    doc.text('ITBIS (18%):', 360, yPosition);
    doc.text(`$${conduce.impuesto.toFixed(2)}`, 450, yPosition);
    yPosition += 20;
    
    doc.fontSize(14).text('TOTAL:', 360, yPosition);
    doc.text(`$${conduce.total.toFixed(2)}`, 450, yPosition);
    
    // Información de crédito
    yPosition += 40;
    doc.fontSize(10).text('DOCUMENTO DE CRÉDITO - NO ES FACTURA FISCAL', 50, yPosition);
    yPosition += 15;
    doc.text(`Fecha de vencimiento: ${conduce.fechaVencimiento.toLocaleDateString('es-DO')}`, 50, yPosition);
    yPosition += 15;
    doc.text('Para factura fiscal, solicitar agrupación de conduces al realizar el pago', 50, yPosition);
    
    // Footer
    doc.fontSize(10).text('Gracias por su preferencia', 50, yPosition + 30);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener conduces pendientes de un cliente para agrupar en factura
app.get('/api/conduces/pendientes/:clienteId', async (req, res) => {
  try {
    const conduces = await Conduce.find({
      cliente: req.params.clienteId,
      estado: 'pendiente'
    }).populate('cliente', 'nombre telefono rnc');
    
    res.json(conduces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anular conduce
app.put('/api/conduces/:id/anular', async (req, res) => {
  try {
    const { motivo } = req.body;
    const conduce = await Conduce.findById(req.params.id).populate('cliente');
    
    if (!conduce) {
      return res.status(404).json({ error: 'Conduce no encontrado' });
    }
    
    if (conduce.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden anular conduces pendientes' });
    }
    
    // Actualizar conduce
    conduce.estado = 'anulado';
    conduce.anulado = true;
    conduce.motivoAnulacion = motivo;
    await conduce.save();
    
    // Actualizar saldo del cliente
    const cliente = await Cliente.findById(conduce.cliente._id);
    cliente.saldoPendiente = Math.max(0, cliente.saldoPendiente - conduce.total);
    await cliente.save();
    
    res.json(conduce);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= RUTAS API PARA FACTURAS =============

// Obtener facturas con filtros
app.get('/api/facturas', async (req, res) => {
  try {
    const { fecha, mes, anio, cliente, rnc } = req.query;
    let query = {};
    
    if (fecha) {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);
      query.fechaEmision = { $gte: startOfDay, $lte: endOfDay };
    } else if (mes && anio) {
      const startOfMonth = new Date(anio, mes - 1, 1);
      const endOfMonth = new Date(anio, mes, 0, 23, 59, 59, 999);
      query.fechaEmision = { $gte: startOfMonth, $lte: endOfMonth };
    }
    
    if (cliente) query.cliente = cliente;
    if (rnc === 'true') query.rnc = { $ne: '' };
    
    const facturas = await Factura.find(query)
      .populate('cliente', 'nombre telefono rnc')
      .sort({ fechaEmision: -1 });
    
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear factura
app.post('/api/facturas', async (req, res) => {
  try {
    console.log('📝 Solicitud de crear factura recibida:', req.body);
    const { clienteId, productos, tipoComprobante, requiereRNC, conducesIds } = req.body;
    
    let productosFactura = productos || [];
    let totalFactura = 0;
    
    // Si se están agrupando conduces
    if (conducesIds && conducesIds.length > 0) {
      console.log('💳 Procesando conduces:', conducesIds);
      const conduces = await Conduce.find({
        _id: { $in: conducesIds },
        cliente: clienteId,
        estado: 'pendiente'
      });
      
      console.log(`🔍 Encontrados ${conduces.length} conduces pendientes de ${conducesIds.length} solicitados`);
      
      if (conduces.length !== conducesIds.length) {
        console.log('❌ Error: algunos conduces no son válidos');
        return res.status(400).json({ error: 'Algunos conduces no son válidos o ya están pagados' });
      }
      
      // Agrupar productos de todos los conduces
      productosFactura = [];
      conduces.forEach(conduce => {
        conduce.productos.forEach(producto => {
          // Buscar si ya existe el producto en la factura
          const existente = productosFactura.find(p => p.descripcion === producto.descripcion && p.precioUnitario === producto.precioUnitario);
          if (existente) {
            existente.cantidad += producto.cantidad;
            existente.total = existente.cantidad * existente.precioUnitario;
          } else {
            productosFactura.push({
              descripcion: producto.descripcion,
              cantidad: producto.cantidad,
              precioUnitario: producto.precioUnitario,
              total: producto.total
            });
          }
        });
        totalFactura += conduce.total;
      });
    } else {
      // Factura normal sin conduces
      productosFactura.forEach(producto => {
        producto.total = producto.cantidad * producto.precioUnitario;
        totalFactura += producto.total;
      });
    }
    
    // Calcular totales finales
    const subtotal = productosFactura.reduce((sum, p) => sum + p.total, 0);
    const impuesto = subtotal * 0.18;
    const total = subtotal + impuesto;
    
    // Generar número de factura
    let numeroFactura = '';
    let secuencia = '';
    
    if (requiereRNC && tipoComprobante === 'FACTURA') {
      // Obtener configuración RNC activa
      const configRNC = await ConfiguracionRNC.findOne({
        activa: true,
        $expr: { $lte: ["$secuenciaActual", "$secuenciaFinal"] }
      }).sort({ fechaVencimiento: 1 });
      
      if (!configRNC) {
        return res.status(400).json({ error: 'No hay secuencias RNC disponibles' });
      }
      
      // Generar número con secuencia
      const numeroSecuencia = configRNC.secuenciaActual.toString().padStart(8, '0');
      numeroFactura = `${configRNC.prefijo}${numeroSecuencia}`;
      secuencia = configRNC.nombre;
      
      // Actualizar secuencia
      configRNC.secuenciaActual += 1;
      await configRNC.save();
    } else {
      // Generar número simple para boletas
      const count = await Factura.countDocuments();
      numeroFactura = `${tipoComprobante}-${(count + 1).toString().padStart(6, '0')}`;
    }
    
    // Obtener cliente
    const cliente = await Cliente.findById(clienteId);
    
    // Permitir que el frontend envíe una fecha de emisión personalizada (por ejemplo, la fecha seleccionada en la UI)
    let fechaEmision = req.body.fechaEmision;
    if (fechaEmision) {
      // Si viene como string (YYYY-MM-DD), crear objeto Date a medianoche local
      if (typeof fechaEmision === 'string' && fechaEmision.length === 10) {
        const [year, month, day] = fechaEmision.split('-').map(Number);
        fechaEmision = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        fechaEmision = new Date(fechaEmision);
      }
    } else {
      // Si no se envía, usar la fecha local del servidor
      const now = new Date();
      fechaEmision = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    const factura = new Factura({
      numero: numeroFactura,
      tipoComprobante,
      cliente: clienteId,
      productos: productosFactura,
      subtotal,
      impuesto,
      total,
      rnc: requiereRNC ? cliente.rnc : '',
      secuencia,
      conduces: conducesIds || [],
      fechaEmision
    });
    
    await factura.save();
    console.log('✅ Factura creada exitosamente:', factura.numero);
    
    // Si hay conduces, marcarlos como pagados
    if (conducesIds && conducesIds.length > 0) {
      console.log('🔄 Actualizando estado de conduces...');
      await Conduce.updateMany(
        { _id: { $in: conducesIds } },
        { 
          estado: 'pagado',
          facturaId: factura._id
        }
      );
      
      // Actualizar saldo del cliente
      const totalConduces = await Conduce.aggregate([
        { $match: { _id: { $in: conducesIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      
      if (totalConduces.length > 0) {
        console.log('💰 Actualizando saldo del cliente:', totalConduces[0].total);
        cliente.saldoPendiente = Math.max(0, cliente.saldoPendiente - totalConduces[0].total);
        await cliente.save();
      }
    }
    
    await factura.populate('cliente', 'nombre telefono rnc direccion');
    console.log('📤 Enviando factura al cliente');
    
    res.json(factura);
  } catch (error) {
    console.error('❌ Error creando factura:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generar PDF de factura
app.get('/api/facturas/:id/pdf', async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id).populate('cliente');
    
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.numero}.pdf"`);
    
    // Pipe PDF al response
    doc.pipe(res);
    
    // Header de la empresa
    doc.fontSize(20).text('COMEDOR & DELIVERY', 50, 50);
    doc.fontSize(12).text('Sistema de Facturación', 50, 75);
    doc.text('RNC: 123456789', 50, 90);
    doc.text('Dirección: Tu Dirección Aquí', 50, 105);
    doc.text('Teléfono: (809) 123-4567', 50, 120);
    
    // Información de la factura
    doc.fontSize(16).text(`${factura.tipoComprobante}`, 400, 50);
    doc.fontSize(12).text(`No: ${factura.numero}`, 400, 75);
    doc.text(`Fecha: ${factura.fechaEmision.toLocaleDateString('es-DO')}`, 400, 90);
    if (factura.secuencia) {
      doc.text(`Secuencia: ${factura.secuencia}`, 400, 105);
    }
    
    // Información del cliente
    doc.text('FACTURAR A:', 50, 160);
    doc.text(`Cliente: ${factura.cliente.nombre}`, 50, 180);
    doc.text(`Teléfono: ${factura.cliente.telefono}`, 50, 195);
    if (factura.rnc) {
      doc.text(`RNC: ${factura.rnc}`, 50, 210);
    }
    if (factura.cliente.direccion) {
      doc.text(`Dirección: ${factura.cliente.direccion}`, 50, 225);
    }
    
    // Tabla de productos
    let yPosition = 260;
    doc.text('DESCRIPCIÓN', 50, yPosition);
    doc.text('CANT.', 300, yPosition);
    doc.text('PRECIO', 360, yPosition);
    doc.text('TOTAL', 450, yPosition);
    
    // Línea separadora
    doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
    yPosition += 30;
    
    factura.productos.forEach(producto => {
      doc.text(producto.descripcion, 50, yPosition);
      doc.text(producto.cantidad.toString(), 300, yPosition);
      doc.text(`$${producto.precioUnitario.toFixed(2)}`, 360, yPosition);
      doc.text(`$${producto.total.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
    });
    
    // Línea separadora
    yPosition += 10;
    doc.moveTo(300, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 20;
    
    // Totales
    doc.text('Subtotal:', 360, yPosition);
    doc.text(`$${factura.subtotal.toFixed(2)}`, 450, yPosition);
    yPosition += 20;
    
    doc.text('ITBIS (18%):', 360, yPosition);
    doc.text(`$${factura.impuesto.toFixed(2)}`, 450, yPosition);
    yPosition += 20;
    
    doc.fontSize(14).text('TOTAL:', 360, yPosition);
    doc.text(`$${factura.total.toFixed(2)}`, 450, yPosition);
    
    // Footer
    doc.fontSize(10).text('Gracias por su preferencia', 50, yPosition + 50);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anular factura
app.put('/api/facturas/:id/anular', async (req, res) => {
  try {
    const { motivo } = req.body;
    const factura = await Factura.findByIdAndUpdate(
      req.params.id,
      { anulada: true, motivoAnulacion: motivo },
      { new: true }
    );
    res.json(factura);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte mensual de facturas con RNC
app.get('/api/reportes/facturas-rnc', async (req, res) => {
  try {
    const { mes, anio } = req.query;
    
    if (!mes || !anio) {
      return res.status(400).json({ error: 'Mes y año son requeridos' });
    }
    
    const startOfMonth = new Date(anio, mes - 1, 1);
    const endOfMonth = new Date(anio, mes, 0, 23, 59, 59, 999);
    
    const facturas = await Factura.find({
      fechaEmision: { $gte: startOfMonth, $lte: endOfMonth },
      rnc: { $ne: '' },
      anulada: false
    }).populate('cliente', 'nombre rnc').sort({ fechaEmision: 1 });
    
    // Generar PDF del reporte
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-rnc-${mes}-${anio}.pdf"`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(16).text('REPORTE MENSUAL DE FACTURAS CON RNC', 50, 50);
    doc.fontSize(12).text(`Período: ${mes}/${anio}`, 50, 75);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-DO')}`, 50, 90);
    
    // Tabla
    let yPosition = 130;
    doc.text('FECHA', 50, yPosition);
    doc.text('FACTURA', 120, yPosition);
    doc.text('CLIENTE', 200, yPosition);
    doc.text('RNC', 350, yPosition);
    doc.text('TOTAL', 450, yPosition);
    
    doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
    yPosition += 25;
    
    let totalGeneral = 0;
    
    facturas.forEach(factura => {
      const fecha = factura.fechaEmision.toLocaleDateString('es-DO');
      doc.fontSize(10);
      doc.text(fecha, 50, yPosition);
      doc.text(factura.numero, 120, yPosition);
      doc.text(factura.cliente.nombre.substring(0, 20), 200, yPosition);
      doc.text(factura.rnc, 350, yPosition);
      doc.text(`$${factura.total.toFixed(2)}`, 450, yPosition);
      
      totalGeneral += factura.total;
      yPosition += 15;
      
      // Nueva página si es necesario
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });
    
    // Total
    yPosition += 20;
    doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 15;
    doc.fontSize(12).text('TOTAL GENERAL:', 350, yPosition);
    doc.text(`$${totalGeneral.toFixed(2)}`, 450, yPosition);
    
    doc.end();
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
  console.log(`🔄 WebSocket servidor en puerto 3007`);
  console.log(`🍃 Base de datos: MongoDB (${MONGODB_URI})`);
});

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await mongoose.connection.close();
  console.log('✅ Conexión a MongoDB cerrada');
  process.exit(0);
});
