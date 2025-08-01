const Gasto = require('../models/Gasto');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[GASTOS] Consultando todos los gastos. Query:', req.query);
      const query = {};
      // Filtrar por fecha si se recibe ?fecha=YYYY-MM-DD
      // IMPORTANTE: Manejar zona horaria correctamente
      if (req.query && req.query.fecha) {
        const fecha = req.query.fecha; // YYYY-MM-DD en hora local
        // Convertir fecha local a rango UTC para la consulta
        const startLocal = new Date(fecha + 'T00:00:00'); // Inicio del día en hora local
        const endLocal = new Date(fecha + 'T23:59:59.999'); // Final del día en hora local
        
        // Convertir a UTC para consultar la base de datos
        const start = new Date(startLocal.toISOString());
        const end = new Date(endLocal.toISOString());
        
        console.log('[GASTOS][DEBUG] Filtrando fecha local:', fecha);
        console.log('[GASTOS][DEBUG] Rango UTC para consulta:', start.toISOString(), 'a', end.toISOString());
        
        query.timestamp = { $gte: start, $lte: end };
      }
      const gastos = await Gasto.find(query);
      console.log(`[GASTOS] Total encontrados: ${gastos.length}`);
      // Normalizar campos para frontend
      const gastosNormalizados = gastos.map(g => {
        const gastoObj = g.toObject();
        // Asegurar que timestamp sea string ISO
        let fechaBase = gastoObj.timestamp || gastoObj.createdAt || new Date();
        gastoObj.timestamp = (fechaBase instanceof Date ? fechaBase : new Date(fechaBase)).toISOString();
        return gastoObj;
      });
      res.json(gastosNormalizados);
    } catch (error) {
      console.error('[GASTOS][ERROR] al consultar todos:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      console.log('[GASTOS] Creando gasto. Datos recibidos:', req.body);
      const { descripcion, concepto, monto, categoria, timestamp } = req.body;
      
      // Aceptar tanto 'descripcion' como 'concepto' para compatibilidad
      const desc = descripcion || concepto;
      
      // Validaciones básicas
      if (!desc || !monto) {
        console.warn('[GASTOS][WARN] Datos faltantes para crear gasto. Recibido:', req.body);
        return res.status(400).json({ error: 'Descripción/concepto y monto son requeridos' });
      }

      const gastoData = {
        descripcion: desc,
        monto: Number(monto),
        categoria: categoria || 'otros'
      };

      if (timestamp) gastoData.timestamp = new Date(timestamp);

      const gasto = new Gasto(gastoData);
      await gasto.save();
      
      // Normalizar timestamp para frontend
      const gastoObj = gasto.toObject();
      let fechaBase = gastoObj.timestamp || gastoObj.createdAt || new Date();
      gastoObj.timestamp = (fechaBase instanceof Date ? fechaBase : new Date(fechaBase)).toISOString();
      
      console.log('[GASTOS] Gasto creado:', gasto._id, gastoObj);
      
      // Emitir por WebSocket
      if (global.broadcast) {
        global.broadcast({ type: 'nuevo_gasto', data: gastoObj });
      }
      
      res.json(gastoObj);
    } catch (error) {
      console.error('[GASTOS][ERROR] al crear:', error, 'Datos recibidos:', req.body);
      res.status(500).json({ error: error.message });
    }
  }
};
