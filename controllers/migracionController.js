const Venta = require('../models/Venta');
const Orden = require('../models/Orden');
const Gasto = require('../models/Gasto');
const MontoInicial = require('../models/MontoInicial');

module.exports = {
  async migrateFromSqlite(req, res) {
    try {
      console.log('[MIGRACION] Iniciando migración desde SQLite');
      const { ventas, ordenes, gastos, montosIniciales } = req.body;
      await Promise.all([
        Venta.deleteMany({}),
        Orden.deleteMany({}),
        Gasto.deleteMany({}),
        MontoInicial.deleteMany({})
      ]);
      if (ventas && ventas.length > 0) {
        await Venta.insertMany(ventas);
        console.log(`[MIGRACION] Ventas migradas: ${ventas.length}`);
      }
      if (ordenes && ordenes.length > 0) {
        await Orden.insertMany(ordenes);
        console.log(`[MIGRACION] Ordenes migradas: ${ordenes.length}`);
      }
      if (gastos && gastos.length > 0) {
        await Gasto.insertMany(gastos);
        console.log(`[MIGRACION] Gastos migrados: ${gastos.length}`);
      }
      if (montosIniciales && montosIniciales.length > 0) {
        await MontoInicial.insertMany(montosIniciales);
        console.log(`[MIGRACION] Montos iniciales migrados: ${montosIniciales.length}`);
      }
      console.log('[MIGRACION] Migración completada exitosamente');
      res.json({ success: true, message: 'Migración completada exitosamente' });
    } catch (error) {
      console.error('[MIGRACION][ERROR] al migrar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
