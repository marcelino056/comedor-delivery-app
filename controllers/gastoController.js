const Gasto = require('../models/Gasto');

module.exports = {
  async getAll(req, res) {
    const query = req.query || {};
    const gastos = await Gasto.find(query);
    res.json(gastos);
  },
  async create(req, res) {
    const gasto = new Gasto(req.body);
    await gasto.save();
    res.json(gasto);
  }
};
