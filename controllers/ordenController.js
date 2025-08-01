const Orden = require('../models/Orden');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[ORDENES] Consultando todas las órdenes. Query:', req.query);
      const query = {};
      // Filtrar por fecha si se recibe ?fecha=YYYY-MM-DD
      if (req.query && req.query.fecha) {
        const fecha = req.query.fecha;
        const start = new Date(fecha + 'T00:00:00.000Z');
        const end = new Date(fecha + 'T23:59:59.999Z');
        query.timestamp = { $gte: start, $lte: end };
      }
      const ordenes = await Orden.find(query);
      console.log(`[ORDENES] Total encontradas: ${ordenes.length}`);
      // Normalizar campos para frontend
      const ordenesNormalizadas = ordenes.map(o => {
        const ordenObj = o.toObject();
        // Asegurar que timestamp sea string ISO
        let fechaBase = ordenObj.timestamp || ordenObj.createdAt || new Date();
        ordenObj.timestamp = (fechaBase instanceof Date ? fechaBase : new Date(fechaBase)).toISOString();
        return ordenObj;
      });
      res.json(ordenesNormalizadas);
    } catch (error) {
      console.error('[ORDENES][ERROR] al consultar todas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      console.log('[ORDENES] Creando orden. Datos recibidos:', req.body);
      const { cliente, telefono, direccion, descripcion, monto, costoDelivery, total, metodoPago, estado, repartidor, timestamp } = req.body;
      
      // Validaciones básicas
      if (!cliente || !telefono || !direccion || !monto || !costoDelivery) {
        console.warn('[ORDENES][WARN] Datos faltantes para crear orden');
        return res.status(400).json({ error: 'Faltan datos requeridos: cliente, telefono, direccion, monto, costoDelivery' });
      }

      const ordenData = {
        cliente,
        telefono,
        direccion,
        descripcion,
        monto: Number(monto),
        costoDelivery: Number(costoDelivery),
        total: Number(total || (monto + costoDelivery)),
        metodoPago,
        estado: estado || 'recibida',
        repartidor,
        anulada: false
      };

      if (timestamp) ordenData.timestamp = new Date(timestamp);

      const orden = new Orden(ordenData);
      await orden.save();
      
      // Normalizar timestamp para frontend
      const ordenObj = orden.toObject();
      let fechaBase = ordenObj.timestamp || ordenObj.createdAt || new Date();
      ordenObj.timestamp = (fechaBase instanceof Date ? fechaBase : new Date(fechaBase)).toISOString();
      
      console.log('[ORDENES] Orden creada:', orden._id, ordenObj);
      
      // Emitir por WebSocket
      if (global.broadcast) {
        global.broadcast({ type: 'nueva_orden', data: ordenObj });
      }
      
      res.json(ordenObj);
    } catch (error) {
      console.error('[ORDENES][ERROR] al crear:', error, 'Datos recibidos:', req.body);
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      console.log(`[ORDENES] Actualizando orden: ${req.params.id}`, req.body);
      const orden = await Orden.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!orden) {
        console.warn(`[ORDENES][WARN] Orden no encontrada para actualizar: ${req.params.id}`);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      console.log('[ORDENES] Orden actualizada:', orden._id);
      res.json(orden);
    } catch (error) {
      console.error('[ORDENES][ERROR] al actualizar:', error, 'ID:', req.params.id);
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      console.log(`[ORDENES] Eliminando orden: ${req.params.id}`);
      await Orden.findByIdAndDelete(req.params.id);
      console.log('[ORDENES] Orden eliminada:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[ORDENES][ERROR] al eliminar:', error, 'ID:', req.params.id);
      res.status(500).json({ error: error.message });
    }
  },

  async anular(req, res) {
    try {
      console.log(`[ORDENES] Anulando orden: ${req.params.id}`);
      const orden = await Orden.findByIdAndUpdate(
        req.params.id,
        { anulada: true },
        { new: true }
      );
      if (!orden) {
        console.warn(`[ORDENES][WARN] Orden no encontrada para anular: ${req.params.id}`);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      console.log('[ORDENES] Orden anulada:', orden._id);
      res.json(orden);
    } catch (error) {
      console.error('[ORDENES][ERROR] al anular:', error, 'ID:', req.params.id);
      res.status(500).json({ error: error.message });
    }
  },

  async cambiarEstado(req, res) {
    try {
      console.log(`[ORDENES] Cambiando estado de orden: ${req.params.id}`, req.body);
      const { estado } = req.body;
      const orden = await Orden.findByIdAndUpdate(
        req.params.id,
        { estado },
        { new: true }
      );
      if (!orden) {
        console.warn(`[ORDENES][WARN] Orden no encontrada para cambiar estado: ${req.params.id}`);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      console.log('[ORDENES] Estado de orden cambiado:', orden._id, 'nuevo estado:', estado);
      res.json(orden);
    } catch (error) {
      console.error('[ORDENES][ERROR] al cambiar estado:', error, 'ID:', req.params.id);
      res.status(500).json({ error: error.message });
    }
  },

  async cambiarMetodoPago(req, res) {
    try {
      console.log(`[ORDENES] Cambiando método de pago de orden: ${req.params.id}`, req.body);
      const { metodoPago } = req.body;
      const orden = await Orden.findByIdAndUpdate(
        req.params.id,
        { metodoPago },
        { new: true }
      );
      if (!orden) {
        console.warn(`[ORDENES][WARN] Orden no encontrada para cambiar método de pago: ${req.params.id}`);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      console.log('[ORDENES] Método de pago de orden cambiado:', orden._id, 'nuevo método:', metodoPago);
      res.json(orden);
    } catch (error) {
      console.error('[ORDENES][ERROR] al cambiar método de pago:', error, 'ID:', req.params.id);
      res.status(500).json({ error: error.message });
    }
  }
};
