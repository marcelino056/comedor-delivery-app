const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');
const { getLocalDate } = require('../utils/dateUtils');

module.exports = {
  // Obtener configuración de empresa
  async get(req, res) {
    try {
      console.log('[CONFIG-EMPRESA] Obteniendo configuración');
      let config = await ConfiguracionEmpresa.findOne();
      
      // Si no existe configuración, crear una por defecto
      if (!config) {
        config = new ConfiguracionEmpresa();
        await config.save();
        console.log('[CONFIG-EMPRESA] Configuración por defecto creada');
      }
      
      res.json(config);
    } catch (error) {
      console.error('[CONFIG-EMPRESA][ERROR] al obtener:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar configuración de empresa
  async update(req, res) {
    try {
      console.log('[CONFIG-EMPRESA] Actualizando configuración:', req.body);
      console.log('[CONFIG-EMPRESA] Headers:', req.headers);
      const { nombre, direccion, telefono, rnc, logo } = req.body;
      
      let config = await ConfiguracionEmpresa.findOne();
      
      if (!config) {
        // Crear nueva configuración si no existe
        config = new ConfiguracionEmpresa({
          nombre,
          direccion,
          telefono,
          rnc,
          logo
        });
      } else {
        // Actualizar configuración existente
        config.nombre = nombre || config.nombre;
        config.direccion = direccion || config.direccion;
        config.telefono = telefono || config.telefono;
        config.rnc = rnc || config.rnc;
        config.logo = logo !== undefined ? logo : config.logo;
        config.fechaActualizacion = getLocalDate();
      }
      
      console.log('[CONFIG-EMPRESA] Datos a guardar:', config.toObject());
      const savedConfig = await config.save();
      console.log('[CONFIG-EMPRESA] Configuración guardada:', savedConfig.toObject());
      
      // Emitir por WebSocket si está disponible
      if (global.broadcast) {
        global.broadcast({ 
          type: 'configuracion_empresa_actualizada', 
          data: savedConfig 
        });
      }
      
      console.log('[CONFIG-EMPRESA] Configuración actualizada exitosamente');
      res.json(savedConfig);
    } catch (error) {
      console.error('[CONFIG-EMPRESA][ERROR] al actualizar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};