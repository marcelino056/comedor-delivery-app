const ConfiguracionRNC = require('../models/ConfiguracionRNC');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[RNC] Consultando todas las configuraciones RNC');
      const configuraciones = await ConfiguracionRNC.find().sort({ nombre: 1 });
      res.json(configuraciones);
    } catch (error) {
      console.error('[RNC][ERROR] al consultar todas:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async create(req, res) {
    try {
      console.log('[RNC] Creando configuración RNC:', req.body);
      const config = new ConfiguracionRNC({
        ...req.body,
        secuenciaActual: req.body.secuenciaInicial
      });
      await config.save();
      console.log('[RNC] Configuración RNC creada:', config._id);
      res.json(config);
    } catch (error) {
      console.error('[RNC][ERROR] al crear:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      console.log(`[RNC] Actualizando configuración RNC: ${req.params.id}`, req.body);
      const config = await ConfiguracionRNC.findByIdAndUpdate(req.params.id, req.body, { new: true });
      console.log('[RNC] Configuración RNC actualizada:', config?._id);
      res.json(config);
    } catch (error) {
      console.error('[RNC][ERROR] al actualizar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
