const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');
const puppeteer = require('puppeteer');

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
