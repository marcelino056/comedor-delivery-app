const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear/conectar base de datos
const db = new sqlite3.Database('./comedor.db');

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monto REAL NOT NULL,
    metodoPago TEXT NOT NULL,
    anulada BOOLEAN DEFAULT 0,
    timestamp TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    costoDelivery REAL NOT NULL,
    total REAL NOT NULL,
    metodoPago TEXT NOT NULL,
    estado TEXT NOT NULL,
    repartidor TEXT NOT NULL,
    anulada BOOLEAN DEFAULT 0,
    timestamp TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT NOT NULL,
    monto REAL NOT NULL,
    timestamp TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS montoInicial (
    fecha TEXT PRIMARY KEY,
    monto REAL NOT NULL
  )`);
});

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
app.get('/api/ventas', (req, res) => {
  db.all('SELECT * FROM ventas ORDER BY timestamp DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Crear nueva venta
app.post('/api/ventas', (req, res) => {
  const { monto, metodoPago, timestamp } = req.body;
  
  const stmt = db.prepare(`INSERT INTO ventas (monto, metodoPago, timestamp) VALUES (?, ?, ?)`);
  stmt.run([monto, metodoPago, timestamp], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const nuevaVenta = { id: this.lastID, monto, metodoPago, anulada: 0, timestamp };
    broadcast({ type: 'nueva_venta', data: nuevaVenta });
    res.json({ id: this.lastID, success: true });
  });
  stmt.finalize();
});

// Anular venta
app.put('/api/ventas/:id/anular', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE ventas SET anulada = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    broadcast({ type: 'venta_anulada', data: { id: parseInt(id) } });
    res.json({ success: true });
  });
});

// Obtener todas las órdenes
app.get('/api/ordenes', (req, res) => {
  db.all('SELECT * FROM ordenes ORDER BY timestamp DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Crear nueva orden
app.post('/api/ordenes', (req, res) => {
  const { cliente, telefono, direccion, descripcion, monto, costoDelivery, total, metodoPago, estado, repartidor, timestamp } = req.body;
  
  const stmt = db.prepare(`INSERT INTO ordenes (cliente, telefono, direccion, descripcion, monto, costoDelivery, total, metodoPago, estado, repartidor, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run([cliente, telefono, direccion, descripcion, monto, costoDelivery, total, metodoPago, estado, repartidor, timestamp], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const nuevaOrden = { id: this.lastID, cliente, telefono, direccion, descripcion, monto, costoDelivery, total, metodoPago, estado, repartidor, anulada: 0, timestamp };
    broadcast({ type: 'nueva_orden', data: nuevaOrden });
    res.json({ id: this.lastID, success: true });
  });
  stmt.finalize();
});

// Actualizar estado de orden
app.put('/api/ordenes/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  db.run('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    broadcast({ type: 'orden_actualizada', data: { id: parseInt(id), estado } });
    res.json({ success: true });
  });
});

// Actualizar método de pago de orden
app.put('/api/ordenes/:id/metodoPago', (req, res) => {
  const { id } = req.params;
  const { metodoPago } = req.body;
  
  db.run('UPDATE ordenes SET metodoPago = ? WHERE id = ?', [metodoPago, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    broadcast({ type: 'orden_actualizada', data: { id: parseInt(id), metodoPago } });
    res.json({ success: true });
  });
});

// Anular orden
app.put('/api/ordenes/:id/anular', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE ordenes SET anulada = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    broadcast({ type: 'orden_anulada', data: { id: parseInt(id) } });
    res.json({ success: true });
  });
});

// Obtener todos los gastos
app.get('/api/gastos', (req, res) => {
  db.all('SELECT * FROM gastos ORDER BY timestamp DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Crear nuevo gasto
app.post('/api/gastos', (req, res) => {
  const { concepto, monto, timestamp } = req.body;
  
  const stmt = db.prepare(`INSERT INTO gastos (concepto, monto, timestamp) VALUES (?, ?, ?)`);
  stmt.run([concepto, monto, timestamp], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const nuevoGasto = { id: this.lastID, concepto, monto, timestamp };
    broadcast({ type: 'nuevo_gasto', data: nuevoGasto });
    res.json({ id: this.lastID, success: true });
  });
  stmt.finalize();
});

// Obtener monto inicial por fecha
app.get('/api/monto-inicial/:fecha', (req, res) => {
  const { fecha } = req.params;
  
  db.get('SELECT monto FROM montoInicial WHERE fecha = ?', [fecha], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ monto: row ? row.monto : 0 });
  });
});

// Establecer monto inicial
app.post('/api/monto-inicial', (req, res) => {
  const { fecha, monto } = req.body;
  
  const stmt = db.prepare(`INSERT OR REPLACE INTO montoInicial (fecha, monto) VALUES (?, ?)`);
  stmt.run([fecha, monto], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    broadcast({ type: 'monto_inicial_actualizado', data: { fecha, monto } });
    res.json({ success: true });
  });
  stmt.finalize();
});

// Servir la aplicación
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📱 Aplicación disponible en http://localhost:${PORT}`);
  console.log(`🔄 WebSocket servidor en puerto 3001`);
});
