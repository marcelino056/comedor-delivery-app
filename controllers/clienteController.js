const Cliente = require('../models/Cliente');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[CLIENTES] Consultando todos los clientes');
      const clientes = await Cliente.find();
      res.json(clientes);
    } catch (error) {
      console.error('[CLIENTES][ERROR] al consultar todos:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async getById(req, res) {
    try {
      console.log(`[CLIENTES] Consultando cliente por ID: ${req.params.id}`);
      const cliente = await Cliente.findById(req.params.id);
      if (!cliente) {
        console.warn(`[CLIENTES][WARN] Cliente no encontrado: ${req.params.id}`);
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      res.json(cliente);
    } catch (error) {
      console.error('[CLIENTES][ERROR] al consultar por ID:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async create(req, res) {
    try {
      console.log('[CLIENTES] Creando cliente:', req.body);
      const cliente = new Cliente(req.body);
      await cliente.save();
      console.log('[CLIENTES] Cliente creado:', cliente._id);
      res.json(cliente);
    } catch (error) {
      console.error('[CLIENTES][ERROR] al crear:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      console.log(`[CLIENTES] Actualizando cliente: ${req.params.id}`, req.body);
      const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!cliente) {
        console.warn(`[CLIENTES][WARN] Cliente no encontrado para actualizar: ${req.params.id}`);
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      console.log('[CLIENTES] Cliente actualizado:', cliente._id);
      res.json(cliente);
    } catch (error) {
      console.error('[CLIENTES][ERROR] al actualizar:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      console.log(`[CLIENTES] Eliminando cliente: ${req.params.id}`);
      await Cliente.findByIdAndDelete(req.params.id);
      console.log('[CLIENTES] Cliente eliminado:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[CLIENTES][ERROR] al eliminar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
