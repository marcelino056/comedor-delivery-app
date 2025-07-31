const MontoInicial = require('../models/MontoInicial');

module.exports = {
  async getByFecha(req, res) {
    const { fecha } = req.params;
    let monto = await MontoInicial.findOne({ fecha });
    if (!monto) monto = { monto: 0 };
    res.json(monto);
  },
  async setMonto(req, res) {
    const { fecha, monto } = req.body;
    let registro = await MontoInicial.findOneAndUpdate(
      { fecha },
      { monto },
      { upsert: true, new: true }
    );
    res.json(registro);
  }
};
