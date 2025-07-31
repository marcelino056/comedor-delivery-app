const Factura = require('../models/Factura');
const Cliente = require('../models/Cliente');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[FACTURAS] Consultando todas las facturas');
      const query = req.query || {};
      const facturas = await Factura.find(query).populate('cliente', 'nombre telefono rnc direccion');
      res.json(facturas);
    } catch (error) {
      console.error('[FACTURAS][ERROR] al consultar todas:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async create(req, res) {
    try {
      console.log('[FACTURAS] Creando factura:', req.body);
      const { clienteId, productos, tipoComprobante, requiereRNC } = req.body;
      const cliente = await Cliente.findById(clienteId);
      if (!cliente) {
        console.warn('[FACTURAS][WARN] Cliente no encontrado para factura:', clienteId);
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      let subtotal = 0;
      productos.forEach(producto => {
        producto.total = producto.cantidad * producto.precioUnitario;
        subtotal += producto.total;
      });
      const impuesto = subtotal * 0.18;
      const total = subtotal + impuesto;
      const count = await Factura.countDocuments();
      const numeroFactura = `FAC-${(count + 1).toString().padStart(6, '0')}`;
      const factura = new Factura({
        numero: numeroFactura,
        cliente: clienteId,
        productos,
        subtotal,
        impuesto,
        total,
        tipoComprobante,
        rnc: requiereRNC ? cliente.rnc : undefined
      });
      await factura.save();
      await factura.populate('cliente', 'nombre telefono rnc direccion');
      console.log('[FACTURAS] Factura creada:', factura.numero);
      res.json(factura);
    } catch (error) {
      console.error('[FACTURAS][ERROR] al crear:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async pdf(req, res) {
    try {
      console.log(`[FACTURAS] Generando PDF para factura: ${req.params.id}`);
      const factura = await Factura.findById(req.params.id).populate('cliente');
      if (!factura) {
        console.warn(`[FACTURAS][WARN] Factura no encontrada para PDF: ${req.params.id}`);
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.numero}.pdf"`);
      doc.pipe(res);
      doc.fontSize(20).text('COMEDOR & DELIVERY', 50, 50);
      doc.fontSize(12).text('Sistema de Facturación', 50, 75);
      doc.text('RNC: 123456789', 50, 90);
      doc.text('Dirección: Tu Dirección Aquí', 50, 105);
      doc.text('Teléfono: (809) 123-4567', 50, 120);
      doc.fontSize(16).text(`${factura.tipoComprobante}`, 400, 50);
      doc.fontSize(12).text(`No: ${factura.numero}`, 400, 75);
      doc.text(`Fecha: ${factura.fechaEmision.toLocaleDateString('es-DO')}`, 400, 90);
      if (factura.secuencia) {
        doc.text(`Secuencia: ${factura.secuencia}`, 400, 105);
      }
      doc.text('FACTURAR A:', 50, 160);
      doc.text(`Cliente: ${factura.cliente.nombre}`, 50, 180);
      doc.text(`Teléfono: ${factura.cliente.telefono}`, 50, 195);
      if (factura.rnc) {
        doc.text(`RNC: ${factura.rnc}`, 50, 210);
      }
      if (factura.cliente.direccion) {
        doc.text(`Dirección: ${factura.cliente.direccion}`, 50, 225);
      }
      let yPosition = 260;
      doc.text('DESCRIPCIÓN', 50, yPosition);
      doc.text('CANT.', 300, yPosition);
      doc.text('PRECIO', 360, yPosition);
      doc.text('TOTAL', 450, yPosition);
      doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
      yPosition += 30;
      factura.productos.forEach(producto => {
        doc.text(producto.descripcion, 50, yPosition);
        doc.text(producto.cantidad.toString(), 300, yPosition);
        doc.text(`$${producto.precioUnitario.toFixed(2)}`, 360, yPosition);
        doc.text(`$${producto.total.toFixed(2)}`, 450, yPosition);
        yPosition += 20;
      });
      yPosition += 10;
      doc.moveTo(300, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 20;
      doc.text('Subtotal:', 360, yPosition);
      doc.text(`$${factura.subtotal.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
      doc.text('ITBIS (18%):', 360, yPosition);
      doc.text(`$${factura.impuesto.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
      doc.fontSize(14).text('TOTAL:', 360, yPosition);
      doc.text(`$${factura.total.toFixed(2)}`, 450, yPosition);
      doc.fontSize(10).text('Gracias por su preferencia', 50, yPosition + 50);
      doc.end();
    } catch (error) {
      console.error('[FACTURAS][ERROR] al generar PDF:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async anular(req, res) {
    try {
      console.log(`[FACTURAS] Anulando factura: ${req.params.id}`);
      const { motivo } = req.body;
      const factura = await Factura.findByIdAndUpdate(
        req.params.id,
        { anulada: true, motivoAnulacion: motivo },
        { new: true }
      );
      if (!factura) {
        console.warn(`[FACTURAS][WARN] Factura no encontrada para anular: ${req.params.id}`);
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
      console.log('[FACTURAS] Factura anulada:', factura._id);
      res.json(factura);
    } catch (error) {
      console.error('[FACTURAS][ERROR] al anular:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async reporteFacturasRNC(req, res) {
    try {
      const { mes, anio } = req.query;
      if (!mes || !anio) {
        console.warn('[FACTURAS][WARN] Mes y año requeridos para reporte RNC');
        return res.status(400).json({ error: 'Mes y año son requeridos' });
      }
      const startOfMonth = new Date(anio, mes - 1, 1);
      const endOfMonth = new Date(anio, mes, 0, 23, 59, 59, 999);
      const facturas = await Factura.find({
        fechaEmision: { $gte: startOfMonth, $lte: endOfMonth },
        rnc: { $ne: '' },
        anulada: false
      }).populate('cliente', 'nombre rnc').sort({ fechaEmision: 1 });
      if (!facturas.length) {
        console.warn('[FACTURAS][WARN] No hay facturas con RNC para el periodo solicitado');
      }
      // Generar PDF del reporte
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-rnc-${mes}-${anio}.pdf"`);
      doc.pipe(res);
      // Header
      doc.fontSize(16).text('REPORTE MENSUAL DE FACTURAS CON RNC', 50, 50);
      doc.fontSize(12).text(`Período: ${mes}/${anio}`, 50, 75);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-DO')}`, 50, 90);
      // Tabla
      let yPosition = 130;
      doc.text('FECHA', 50, yPosition);
      doc.text('FACTURA', 120, yPosition);
      doc.text('CLIENTE', 200, yPosition);
      doc.text('RNC', 350, yPosition);
      doc.text('TOTAL', 450, yPosition);
      doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
      yPosition += 25;
      let totalGeneral = 0;
      facturas.forEach(factura => {
        const fecha = factura.fechaEmision.toLocaleDateString('es-DO');
        doc.fontSize(10);
        doc.text(fecha, 50, yPosition);
        doc.text(factura.numero, 120, yPosition);
        doc.text(factura.cliente.nombre.substring(0, 20), 200, yPosition);
        doc.text(factura.rnc, 350, yPosition);
        doc.text(`$${factura.total.toFixed(2)}`, 450, yPosition);
        totalGeneral += factura.total;
        yPosition += 15;
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });
      // Total
      yPosition += 20;
      doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 15;
      doc.fontSize(12).text('TOTAL GENERAL:', 350, yPosition);
      doc.text(`$${totalGeneral.toFixed(2)}`, 450, yPosition);
      doc.end();
      console.log('[FACTURAS] Reporte mensual de facturas con RNC generado');
    } catch (error) {
      console.error('[FACTURAS][ERROR] al generar reporte RNC:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
