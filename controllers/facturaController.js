const Factura = require('../models/Factura');
const Cliente = require('../models/Cliente');
const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');

module.exports = {
  async getAll(req, res) {
    try {
      console.log('[FACTURAS] Consultando todas las facturas. Query:', req.query);
      const query = {};
      
      // Filtrar por fecha específica
      if (req.query.fecha) {
        const fecha = req.query.fecha; // YYYY-MM-DD
        const startLocal = new Date(fecha + 'T00:00:00');
        const endLocal = new Date(fecha + 'T23:59:59.999');
        
        // Convertir a UTC para consultar la base de datos
        const start = new Date(startLocal.toISOString());
        const end = new Date(endLocal.toISOString());
        
        console.log(`[FACTURAS][DEBUG] Filtrando por fecha local: ${fecha}, rango UTC: ${start.toISOString()} a ${end.toISOString()}`);
        query.fechaEmision = { $gte: start, $lte: end };
      }
      
      // Filtrar por mes y año
      if (req.query.mes && req.query.anio) {
        const mes = parseInt(req.query.mes);
        const anio = parseInt(req.query.anio);
        const startOfMonth = new Date(anio, mes - 1, 1);
        const endOfMonth = new Date(anio, mes, 0, 23, 59, 59, 999);
        
        console.log(`[FACTURAS][DEBUG] Filtrando por mes ${mes}/${anio}: ${startOfMonth.toISOString()} a ${endOfMonth.toISOString()}`);
        query.fechaEmision = { $gte: startOfMonth, $lte: endOfMonth };
      }
      
      // Filtrar por rango personalizado
      if (req.query.fechaDesde || req.query.fechaHasta) {
        const dateFilter = {};
        
        if (req.query.fechaDesde) {
          const startLocal = new Date(req.query.fechaDesde + 'T00:00:00');
          const start = new Date(startLocal.toISOString());
          dateFilter.$gte = start;
        }
        
        if (req.query.fechaHasta) {
          const endLocal = new Date(req.query.fechaHasta + 'T23:59:59.999');
          const end = new Date(endLocal.toISOString());
          dateFilter.$lte = end;
        }
        
        console.log(`[FACTURAS][DEBUG] Filtrando por rango personalizado:`, dateFilter);
        query.fechaEmision = dateFilter;
      }
      
      // Filtrar por tipo de comprobante
      if (req.query.tipo) {
        query.tipoComprobante = req.query.tipo;
      }
      
      // Filtrar por RNC
      if (req.query.rnc) {
        query.rnc = { $exists: req.query.rnc === 'con' };
      }
      
      // Filtrar por ID de orden de delivery
      if (req.query.ordenDeliveryId) {
        query.ordenDeliveryId = req.query.ordenDeliveryId;
        console.log(`[FACTURAS][DEBUG] Filtrando por orden de delivery: ${req.query.ordenDeliveryId}`);
      }
      
      console.log(`[FACTURAS][DEBUG] Query final:`, query);
      
      const facturas = await Factura.find(query)
        .populate('cliente', 'nombre telefono rnc direccion')
        .sort({ fechaEmision: -1 });
      
      console.log(`[FACTURAS] Total encontradas: ${facturas.length}`);
      res.json(facturas);
    } catch (error) {
      console.error('[FACTURAS][ERROR] al consultar todas:', error);
      res.status(500).json({ error: error.message });
    }
  },
  async create(req, res) {
    try {
      console.log('[FACTURAS] Creando factura:', req.body);
      const { 
        clienteId, 
        productos, 
        conducesIds, 
        tipoComprobante, 
        requiereRNC,
        ordenDeliveryId,
        clienteNombre,
        clienteTelefono,
        clienteDireccion,
        esComprobanteFiscal,
        metodoPago,
        fechaEmision
      } = req.body;
      
      let cliente = null;
      let clienteData = {};
      
      // Caso 1: Factura desde delivery (sin cliente registrado)
      if (ordenDeliveryId && clienteNombre) {
        console.log('[FACTURAS] Creando factura para delivery sin cliente registrado');
        clienteData = {
          nombre: clienteNombre,
          telefono: clienteTelefono || '',
          direccion: clienteDireccion || '',
          rnc: ''
        };
      }
      // Caso 2: Factura desde cliente registrado
      else if (clienteId) {
        cliente = await Cliente.findById(clienteId);
        if (!cliente) {
          console.warn('[FACTURAS][WARN] Cliente no encontrado para factura:', clienteId);
          return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        clienteData = {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          rnc: cliente.rnc || ''
        };
      }
      else {
        return res.status(400).json({ error: 'Debe proporcionar clienteId o datos de delivery' });
      }
      
      let subtotal = 0;
      let productosParaFactura = [];
      
      // Caso 1: Factura desde productos individuales
      if (productos && productos.length > 0) {
        productos.forEach(producto => {
          producto.total = producto.cantidad * producto.precioUnitario;
          subtotal += producto.total;
        });
        productosParaFactura = productos;
      }
      // Caso 2: Factura desde conduces (pago de créditos)
      else if (conducesIds && conducesIds.length > 0) {
        const Conduce = require('../models/Conduce');
        const conduces = await Conduce.find({ 
          _id: { $in: conducesIds },
          cliente: clienteId,
          estado: 'pendiente'
        });
        
        if (conduces.length !== conducesIds.length) {
          return res.status(400).json({ error: 'Algunos conduces no son válidos o ya fueron pagados' });
        }
        
        // Agrupar productos de todos los conduces
        conduces.forEach(conduce => {
          conduce.productos.forEach(producto => {
            productosParaFactura.push({
              descripcion: `${producto.descripcion} (Conduce ${conduce.numero})`,
              cantidad: producto.cantidad,
              precioUnitario: producto.precioUnitario,
              total: producto.cantidad * producto.precioUnitario
            });
            subtotal += producto.cantidad * producto.precioUnitario;
          });
        });
        
        // Calcular total pagado de los conduces
        const totalPagado = conduces.reduce((sum, conduce) => sum + conduce.total, 0);
        
        // Marcar conduces como pagados
        await Conduce.updateMany(
          { _id: { $in: conducesIds } },
          { estado: 'pagado', fechaPago: new Date() }
        );
        
        // Actualizar saldo del cliente si existe
        if (cliente) {
          cliente.saldoPendiente = Math.max(0, cliente.saldoPendiente - totalPagado);
          await cliente.save();
        }
        
        console.log(`[FACTURAS] Agrupando ${conduces.length} conduces en factura. Total: ${totalPagado}`);
      }
      else {
        return res.status(400).json({ error: 'Debe proporcionar productos o conduces para la factura' });
      }
      
      // Solo aplicar ITBIS si es comprobante fiscal
      const impuesto = esComprobanteFiscal ? subtotal * 0.18 : 0;
      const total = subtotal + impuesto;
      const count = await Factura.countDocuments();
      const numeroFactura = `FAC-${(count + 1).toString().padStart(6, '0')}`;
      
      // Construir datos de la factura
      const facturaData = {
        numero: numeroFactura,
        productos: productosParaFactura,
        subtotal,
        impuesto,
        total,
        tipoComprobante: tipoComprobante || 'BOLETA',
        esComprobanteFiscal: esComprobanteFiscal || false,
        metodoPago: metodoPago || 'efectivo',
        fechaEmision: fechaEmision ? new Date(fechaEmision) : new Date()
      };
      
      // Si es factura de delivery, usar datos directos
      if (ordenDeliveryId) {
        facturaData.ordenDeliveryId = ordenDeliveryId;
        facturaData.clienteNombre = clienteData.nombre;
        facturaData.clienteTelefono = clienteData.telefono;
        facturaData.clienteDireccion = clienteData.direccion;
        facturaData.rnc = requiereRNC ? clienteData.rnc : undefined;
        // No asignar cliente ID para delivery
      } else {
        // Factura normal con cliente registrado
        facturaData.cliente = clienteId;
        facturaData.rnc = requiereRNC ? clienteData.rnc : undefined;
      }
      
      const factura = new Factura(facturaData);
      await factura.save();
      
      // Solo popular cliente si existe
      if (clienteId) {
        await factura.populate('cliente', 'nombre telefono rnc direccion');
      }
      
      // Para facturas de delivery, agregar datos de cliente manual para respuesta
      if (ordenDeliveryId) {
        factura.cliente = clienteData;
      }
      
      // Emitir por WebSocket
      if (global.broadcast) {
        global.broadcast({ type: 'nueva_factura', data: factura });
        
        // Si es una factura de pago de créditos, notificar que los créditos se actualizaron
        if (conducesIds && conducesIds.length > 0) {
          global.broadcast({ type: 'creditos_actualizados', data: { conducesIds, facturaId: factura._id } });
        }
      }
      
      console.log('[FACTURAS] Factura creada:', factura.numero, `Total: ${total}, Productos: ${productosParaFactura.length}`);
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

      // Cargar configuración de la empresa
      let configuracionEmpresa;
      try {
        configuracionEmpresa = await ConfiguracionEmpresa.findOne();
      } catch (error) {
        console.warn('[FACTURAS] Error cargando configuración de empresa, usando valores por defecto:', error);
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
      res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.numero}.pdf"`);
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

      // Información de la factura
      doc.fontSize(16).text(`${factura.tipoComprobante}`, 400, 50);
      doc.fontSize(12).text(`No: ${factura.numero}`, 400, 75);
      doc.text(`Fecha: ${factura.fechaEmision.toLocaleDateString('es-DO')}`, 400, 90);
      if (factura.secuencia) {
        doc.text(`Secuencia: ${factura.secuencia}`, 400, 105);
      }
      // Información del cliente
      let clienteInfo;
      if (factura.cliente && factura.cliente.nombre) {
        // Cliente registrado
        clienteInfo = {
          nombre: factura.cliente.nombre,
          telefono: factura.cliente.telefono || '',
          direccion: factura.cliente.direccion || '',
          rnc: factura.cliente.rnc || ''
        };
      } else {
        // Factura de delivery con datos directos
        clienteInfo = {
          nombre: factura.clienteNombre || 'Cliente Delivery',
          telefono: factura.clienteTelefono || '',
          direccion: factura.clienteDireccion || '',
          rnc: ''
        };
      }
      
      doc.text('FACTURAR A:', 50, 160);
      doc.text(`Cliente: ${clienteInfo.nombre}`, 50, 180);
      doc.text(`Teléfono: ${clienteInfo.telefono}`, 50, 195);
      if (factura.rnc) {
        doc.text(`RNC: ${factura.rnc}`, 50, 210);
      }
      if (clienteInfo.direccion) {
        doc.text(`Dirección: ${clienteInfo.direccion}`, 50, 225);
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
      console.log('[FACTURAS][REPORTE-RNC] Generando reporte RNC. Query:', req.query);
      const { mes, anio } = req.query;
      if (!mes || !anio) {
        console.warn('[FACTURAS][WARN] Mes y año requeridos para reporte RNC');
        return res.status(400).json({ error: 'Mes y año son requeridos' });
      }
      const startOfMonth = new Date(anio, mes - 1, 1);
      const endOfMonth = new Date(anio, mes, 0, 23, 59, 59, 999);
      const facturas = await Factura.find({
        fechaEmision: { $gte: startOfMonth, $lte: endOfMonth },
        rnc: { $exists: true, $ne: null, $ne: '' },
        estado: { $ne: 'anulada' }
      }).populate('cliente', 'nombre rnc').sort({ fechaEmision: 1 });
      
      console.log(`[FACTURAS][REPORTE-RNC] Facturas encontradas: ${facturas.length}`);
      
      if (!facturas.length) {
        console.warn('[FACTURAS][WARN] No hay facturas con RNC para el periodo solicitado');
      }

      // Cargar configuración de la empresa
      let configuracionEmpresa;
      try {
        configuracionEmpresa = await ConfiguracionEmpresa.findOne();
      } catch (error) {
        console.warn('[FACTURAS] Error cargando configuración de empresa para reporte RNC, usando valores por defecto:', error);
        configuracionEmpresa = {
          nombre: 'COMEDOR & DELIVERY',
          direccion: 'Tu Dirección Aquí',
          telefono: '(809) 123-4567',
          rnc: '123456789'
        };
      }

      // Generar PDF del reporte
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-rnc-${mes}-${anio}.pdf"`);
      doc.pipe(res);

      // Cabecera de la empresa
      doc.fontSize(18).text(configuracionEmpresa?.nombre || 'COMEDOR & DELIVERY', 50, 50);
      doc.fontSize(10);
      if (configuracionEmpresa?.rnc) {
        doc.text(`RNC: ${configuracionEmpresa.rnc}`, 50, 75);
      }
      if (configuracionEmpresa?.direccion) {
        doc.text(`Dirección: ${configuracionEmpresa.direccion}`, 50, 88);
      }
      if (configuracionEmpresa?.telefono) {
        doc.text(`Teléfono: ${configuracionEmpresa.telefono}`, 50, 101);
      }

      // Título del reporte
      doc.fontSize(16).text('REPORTE MENSUAL DE FACTURAS CON RNC', 50, 125);
      doc.fontSize(12).text(`Período: ${mes}/${anio}`, 50, 145);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-DO')}`, 50, 160);

      // Tabla
      let yPosition = 185;
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
