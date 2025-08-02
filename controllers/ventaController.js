const Venta = require('../models/Venta');
const Cliente = require('../models/Cliente');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[VENTAS] Consultando todas las ventas. Query:', req.query);
      const query = {};
      // Filtrar por fecha si se recibe ?fecha=YYYY-MM-DD
      if (req.query && req.query.fecha) {
        const fecha = req.query.fecha;
        // Usar el mismo método que el reporte para consistencia con zona horaria
        const startLocal = new Date(fecha + 'T00:00:00');
        const endLocal = new Date(fecha + 'T23:59:59.999');
        const start = new Date(startLocal.toISOString());
        const end = new Date(endLocal.toISOString());
        
        console.log(`[VENTAS][DEBUG] Filtrando por fecha local: ${fecha}, rango UTC: ${start.toISOString()} a ${end.toISOString()}`);
        query.fecha = { $gte: start, $lte: end };
        query.estado = { $ne: 'anulada' }; // Excluir ventas anuladas
      }
      const ventas = await Venta.find(query).populate('cliente', 'nombre telefono');
      console.log(`[VENTAS] Total encontradas: ${ventas.length}`);
      // Normalizar campos para frontend
      const ventasNormalizadas = ventas.map(v => {
        const ventaObj = v.toObject();
        ventaObj.monto = Number(ventaObj.total) || 0;
        let fechaBase = ventaObj.fecha || ventaObj.createdAt || new Date();
        ventaObj.timestamp = (fechaBase instanceof Date ? fechaBase : new Date(fechaBase)).toISOString();
        return ventaObj;
      });
      res.json(ventasNormalizadas);
    } catch (error) {
      console.error('[VENTAS][ERROR] al consultar todas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      console.log('[VENTAS] Creando venta. Datos recibidos:', req.body);
      const { clienteId, productos, metodoPago, observaciones, monto, timestamp } = req.body;
      let subtotal = 0;
      let impuesto = 0;
      let total = 0;
      let ventaData = {};
      if (productos && Array.isArray(productos) && productos.length > 0) {
        productos.forEach(producto => {
          producto.total = producto.cantidad * producto.precioUnitario;
          subtotal += producto.total;
        });
        impuesto = subtotal * 0.18;
        total = subtotal + impuesto;
        ventaData.productos = productos;
      } else if (typeof monto === 'number' && monto > 0) {
        subtotal = monto;
        total = monto;
        ventaData.productos = [];
      } else {
        console.warn('[VENTAS][WARN] Venta sin productos ni monto válido');
        return res.status(400).json({ error: 'Debe enviar productos o un monto válido' });
      }
      const count = await Venta.countDocuments();
      const numeroVenta = `VEN-${(count + 1).toString().padStart(6, '0')}`;
      ventaData = {
        ...ventaData,
        numero: numeroVenta,
        cliente: clienteId || undefined,
        subtotal,
        impuesto,
        total,
        metodoPago,
        observaciones
      };
      if (timestamp) ventaData.fecha = timestamp;
      const venta = new Venta(ventaData);
      await venta.save();
      await venta.populate('cliente', 'nombre telefono');
      // Normalizar campos para frontend
      const ventaObj = venta.toObject();
      ventaObj.monto = Number(ventaObj.total) || 0; // Asegura número
      // timestamp: siempre string ISO
      let fechaBase = ventaObj.fecha || ventaObj.createdAt || new Date();
      ventaObj.timestamp = (fechaBase instanceof Date ? fechaBase : new Date(fechaBase)).toISOString();
      console.log('[VENTAS] Venta creada:', venta.numero, ventaObj);
      // Emitir por WebSocket
      if (global.broadcast) {
        global.broadcast({ type: 'nueva_venta', data: ventaObj });
      }
      res.json(ventaObj);
    } catch (error) {
      console.error('[VENTAS][ERROR] al crear:', error, 'Datos recibidos:', req.body);
      res.status(500).json({ error: error.message });
    }
  },

  async anular(req, res) {
    try {
      const ventaId = req.params.id;
      console.log(`[VENTAS] === ANULANDO VENTA ===`);
      console.log(`[VENTAS] ID recibido: ${ventaId}`);
      console.log(`[VENTAS] Método HTTP: ${req.method}`);
      
      // Validar que el ID sea válido
      if (!ventaId || ventaId === 'undefined') {
        console.error(`[VENTAS][ERROR] ID de venta inválido: ${ventaId}`);
        return res.status(400).json({ error: 'ID de venta inválido' });
      }

      const venta = await Venta.findByIdAndUpdate(
        ventaId,
        { estado: 'anulada' },
        { new: true }
      );
      
      if (!venta) {
        console.warn(`[VENTAS][WARN] Venta no encontrada para anular: ${ventaId}`);
        return res.status(404).json({ error: 'Venta no encontrada' });
      }
      
      console.log(`[VENTAS] ✅ Venta anulada exitosamente: ${venta._id}`);
      console.log(`[VENTAS] Estado anterior -> nuevo: activa -> ${venta.estado}`);
      
      res.json(venta);
    } catch (error) {
      console.error('[VENTAS][ERROR] al anular venta:');
      console.error('[VENTAS][ERROR] ID:', req.params.id);
      console.error('[VENTAS][ERROR] Error completo:', error);
      console.error('[VENTAS][ERROR] Stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  }
};
