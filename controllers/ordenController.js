const Orden = require('../models/Orden');

module.exports = {
  async getAll(req, res) {
    const query = req.query || {};
    const ordenes = await Orden.find(query);
    res.json(ordenes);
  },
  async create(req, res) {
    const orden = new Orden(req.body);
    await orden.save();
    res.json(orden);
  },
  async update(req, res) {
    const orden = await Orden.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(orden);
  },
  async delete(req, res) {
    await Orden.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }
};
