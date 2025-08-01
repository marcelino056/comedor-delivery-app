const MontoInicial = require('../models/MontoInicial');

module.exports = {
  async getByFecha(req, res) {
    try {
      const { fecha } = req.params;
      console.log('[MONTO_INICIAL] Consultando monto para fecha:', fecha);
      let monto = await MontoInicial.findOne({ fecha });
      if (!monto) {
        console.log('[MONTO_INICIAL] No encontrado, usando 0 por defecto');
        monto = { monto: 0 };
      } else {
        console.log('[MONTO_INICIAL] Monto encontrado:', monto.monto);
      }
      res.json(monto);
    } catch (error) {
      console.error('[MONTO_INICIAL][ERROR] al consultar:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async setMonto(req, res) {
    try {
      const { fecha, monto } = req.body;
      console.log('[MONTO_INICIAL] Estableciendo monto:', monto, 'para fecha:', fecha);
      
      if (!fecha || monto === undefined || monto === null) {
        console.warn('[MONTO_INICIAL][WARN] Datos faltantes');
        return res.status(400).json({ error: 'Fecha y monto son requeridos' });
      }

      let registro = await MontoInicial.findOneAndUpdate(
        { fecha },
        { monto: Number(monto) },
        { upsert: true, new: true }
      );
      
      console.log('[MONTO_INICIAL] Monto establecido:', registro);
      
      // Emitir por WebSocket
      if (global.broadcast) {
        global.broadcast({ type: 'monto_inicial_actualizado', data: { fecha, monto: Number(monto) } });
      }
      
      res.json(registro);
    } catch (error) {
      console.error('[MONTO_INICIAL][ERROR] al establecer:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
