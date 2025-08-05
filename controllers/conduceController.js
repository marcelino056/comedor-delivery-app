const Conduce = require('../models/Conduce');
const Cliente = require('../models/Cliente');
const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');
const { getLocalDate, addDays } = require('../utils/dateUtils');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[CONDUCES] Consultando todos los conduces. Query:', req.query);
      const { incluirTodos, ...queryParams } = req.query;
      const query = { ...queryParams };
      
      // Por defecto, mostrar solo conduces pendientes (no pagados ni anulados)
      if (!query.estado && !incluirTodos) {
        query.estado = 'pendiente';
      }
      
      console.log('[CONDUCES] Query final:', query);
      const conduces = await Conduce.find(query)
        .populate('cliente', 'nombre telefono rnc direccion')
        .sort({ fechaCreacion: -1 });
      
      console.log(`[CONDUCES] Total encontrados: ${conduces.length}`);
      res.json(conduces);
    } catch (error) {
      console.error('[CONDUCES][ERROR] al consultar todos:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async create(req, res) {
    try {
      console.log('[CONDUCES] Creando conduce:', req.body);
      const { clienteId, productos, diasVencimiento, esComprobanteFiscal } = req.body;
      
      console.log('[CONDUCES] Es comprobante fiscal:', esComprobanteFiscal);
      console.log('[CONDUCES] Subtotal frontend:', req.body.subtotal);
      console.log('[CONDUCES] Impuesto frontend:', req.body.impuesto);
      console.log('[CONDUCES] Total frontend:', req.body.total);
      
      const cliente = await Cliente.findById(clienteId);
      if (!cliente) {
        console.warn('[CONDUCES][WARN] Cliente no encontrado para conduce:', clienteId);
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      if (!cliente.creditoHabilitado) {
        console.warn('[CONDUCES][WARN] Cliente sin crédito habilitado:', clienteId);
        return res.status(400).json({ error: 'Cliente no tiene crédito habilitado' });
      }
      // Usar los valores calculados del frontend si están disponibles
      let subtotal = req.body.subtotal;
      let impuesto = req.body.impuesto;
      let total = req.body.total;
      
      // Solo recalcular si no vienen del frontend
      if (subtotal === undefined || impuesto === undefined || total === undefined) {
        subtotal = 0;
        productos.forEach(producto => {
          producto.total = producto.cantidad * producto.precioUnitario;
          subtotal += producto.total;
        });
        impuesto = esComprobanteFiscal ? subtotal * 0.18 : 0;
        total = subtotal + impuesto;
      } else {
        // Verificar que los productos tengan totales calculados
        productos.forEach(producto => {
          if (!producto.total) {
            producto.total = producto.cantidad * producto.precioUnitario;
          }
        });
      }
      
      console.log('[CONDUCES] Totales finales - Subtotal:', subtotal, 'Impuesto:', impuesto, 'Total:', total);
      
      const nuevoSaldo = cliente.saldoPendiente + total;
      if (nuevoSaldo > cliente.limiteCredito) {
        console.warn('[CONDUCES][WARN] Límite de crédito excedido para cliente:', clienteId);
        return res.status(400).json({ error: `Límite de crédito excedido. Disponible: $${(cliente.limiteCredito - cliente.saldoPendiente).toFixed(2)}` });
      }
      const count = await Conduce.countDocuments();
      const numeroConduce = `CON-${(count + 1).toString().padStart(6, '0')}`;
      const fechaVencimiento = addDays(getLocalDate(), diasVencimiento || cliente.diasCredito);
      const conduce = new Conduce({
        numero: numeroConduce,
        cliente: clienteId,
        productos,
        subtotal,
        impuesto,
        total,
        fechaVencimiento,
        esComprobanteFiscal: esComprobanteFiscal || false
      });
      await conduce.save();
      cliente.saldoPendiente = nuevoSaldo;
      await cliente.save();
      await conduce.populate('cliente', 'nombre telefono rnc direccion');
      if (global.broadcast) {
        global.broadcast({ type: 'nuevo_conduce', data: conduce });
      }
      console.log('[CONDUCES] Conduce creado:', conduce.numero);
      res.json(conduce);
    } catch (error) {
      console.error('[CONDUCES][ERROR] al crear:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async pdf(req, res) {
    try {
      console.log(`[CONDUCES] Generando PDF para conduce: ${req.params.id}`);
      const conduce = await Conduce.findById(req.params.id).populate('cliente');
      if (!conduce) {
        console.warn(`[CONDUCES][WARN] Conduce no encontrado para PDF: ${req.params.id}`);
        return res.status(404).json({ error: 'Conduce no encontrado' });
      }

      // Cargar configuración de la empresa
      let configuracionEmpresa;
      try {
        configuracionEmpresa = await ConfiguracionEmpresa.findOne();
      } catch (error) {
        console.warn('[CONDUCES] Error cargando configuración de empresa, usando valores por defecto:', error);
        configuracionEmpresa = {
          nombre: 'COMEDOR & DELIVERY',
          direccion: 'Tu Dirección Aquí',
          telefono: '(809) 123-4567',
          rnc: '123456789'
        };
      }

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="conduce-${conduce.numero}.pdf"`);
      doc.pipe(res);

      // Cabecera de la empresa con información dinámica
      doc.fontSize(20).text(configuracionEmpresa?.nombre || 'COMEDOR & DELIVERY', 50, 50);
      doc.fontSize(12).text('Sistema de Facturación', 50, 75);
      if (configuracionEmpresa?.rnc) {
        doc.text(`RNC: ${configuracionEmpresa.rnc}`, 50, 90);
      }
      if (configuracionEmpresa?.direccion) {
        doc.text(`Dirección: ${configuracionEmpresa.direccion}`, 50, 105);
      }
      if (configuracionEmpresa?.telefono) {
        doc.text(`Teléfono: ${configuracionEmpresa.telefono}`, 50, 120);
      }

      // Información del conduce
      doc.fontSize(16).text('CONDUCE', 400, 50);
      doc.fontSize(12).text(`No: ${conduce.numero}`, 400, 75);
      doc.text(`Fecha: ${conduce.fechaEmision ? conduce.fechaEmision.toLocaleDateString('es-DO') : ''}`, 400, 90);
      doc.text(`Vence: ${conduce.fechaVencimiento ? conduce.fechaVencimiento.toLocaleDateString('es-DO') : ''}`, 400, 105);
      doc.text(`Estado: ${conduce.estado ? conduce.estado.toUpperCase() : ''}`, 400, 120);
      doc.text('ENTREGAR A:', 50, 160);
      doc.text(`Cliente: ${conduce.cliente.nombre}`, 50, 180);
      doc.text(`Teléfono: ${conduce.cliente.telefono}`, 50, 195);
      if (conduce.cliente.rnc) {
        doc.text(`RNC: ${conduce.cliente.rnc}`, 50, 210);
      }
      if (conduce.cliente.direccion) {
        doc.text(`Dirección: ${conduce.cliente.direccion}`, 50, 225);
      }
      let yPosition = 260;
      doc.text('DESCRIPCIÓN', 50, yPosition);
      doc.text('CANT.', 300, yPosition);
      doc.text('PRECIO', 360, yPosition);
      doc.text('TOTAL', 450, yPosition);
      doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
      yPosition += 30;
      conduce.productos.forEach(producto => {
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
      doc.text(`$${conduce.subtotal.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
      doc.text('ITBIS (18%):', 360, yPosition);
      doc.text(`$${conduce.impuesto.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
      doc.fontSize(14).text('TOTAL:', 360, yPosition);
      doc.text(`$${conduce.total.toFixed(2)}`, 450, yPosition);
      yPosition += 40;
      doc.fontSize(10).text('DOCUMENTO DE CRÉDITO - NO ES FACTURA FISCAL', 50, yPosition);
      yPosition += 15;
      doc.text(`Fecha de vencimiento: ${conduce.fechaVencimiento ? conduce.fechaVencimiento.toLocaleDateString('es-DO') : ''}`, 50, yPosition);
      yPosition += 15;
      doc.text('Para factura fiscal, solicitar agrupación de conduces al realizar el pago', 50, yPosition);
      doc.fontSize(10).text('Gracias por su preferencia', 50, yPosition + 30);
      doc.end();
      console.log('[CONDUCES] PDF generado para conduce:', conduce.numero);
    } catch (error) {
      console.error('[CONDUCES][ERROR] al generar PDF:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async pendientes(req, res) {
    try {
      console.log(`[CONDUCES] Consultando conduces pendientes para cliente: ${req.params.clienteId}`);
      const conduces = await Conduce.find({
        cliente: req.params.clienteId,
        estado: 'pendiente'
      }).populate('cliente', 'nombre telefono rnc');
      res.json(conduces);
    } catch (error) {
      console.error('[CONDUCES][ERROR] al consultar pendientes:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async anular(req, res) {
    try {
      console.log(`[CONDUCES] Anulando conduce: ${req.params.id}`);
      const { motivo } = req.body;
      const conduce = await Conduce.findById(req.params.id).populate('cliente');
      if (!conduce) {
        console.warn(`[CONDUCES][WARN] Conduce no encontrado para anular: ${req.params.id}`);
        return res.status(404).json({ error: 'Conduce no encontrado' });
      }
      if (conduce.estado !== 'pendiente') {
        console.warn(`[CONDUCES][WARN] Solo se pueden anular conduces pendientes: ${req.params.id}`);
        return res.status(400).json({ error: 'Solo se pueden anular conduces pendientes' });
      }
      conduce.estado = 'anulado';
      conduce.anulado = true;
      conduce.motivoAnulacion = motivo;
      await conduce.save();
      const cliente = await Cliente.findById(conduce.cliente._id);
      cliente.saldoPendiente = Math.max(0, cliente.saldoPendiente - conduce.total);
      await cliente.save();
      console.log('[CONDUCES] Conduce anulado:', conduce.numero);
      res.json(conduce);
    } catch (error) {
      console.error('[CONDUCES][ERROR] al anular:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
