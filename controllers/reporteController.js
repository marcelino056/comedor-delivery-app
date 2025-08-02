const puppeteer = require('puppeteer');
const MontoInicial = require('../models/MontoInicial');
const Venta = require('../models/Venta');
const Gasto = require('../models/Gasto');
const Orden = require('../models/Orden');
const Conduce = require('../models/Conduce');
const Factura = require('../models/Factura');
const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');
const path = require('path');
const fs = require('fs');

function generateReportHTML(data, configuracionEmpresa) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };
  
  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reporte Diario - ${data.fecha}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .empresa-header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ccc; }
        .empresa-header h1 { margin: 0; color: #007bff; font-size: 24px; }
        .empresa-header .info { font-size: 12px; color: #666; margin: 5px 0; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .summary { display: flex; justify-content: space-between; margin: 20px 0; }
        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; }
        .summary-card h3 { margin: 0 0 10px 0; color: #007bff; }
        .summary-card .amount { font-size: 1.5em; font-weight: bold; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .section { margin: 30px 0; }
        .section h2 { color: #007bff; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .transactions { display: flex; justify-content: space-between; }
        .transaction-list { flex: 1; margin: 0 10px; }
        .transaction-item { border: 1px solid #eee; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .transaction-item .amount { font-weight: bold; float: right; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="empresa-header">
        <h1>${configuracionEmpresa?.nombre || 'COMEDOR & DELIVERY'}</h1>
        ${configuracionEmpresa?.rnc ? `<div class="info">RNC: ${configuracionEmpresa.rnc}</div>` : ''}
        ${configuracionEmpresa?.direccion ? `<div class="info">Dirección: ${configuracionEmpresa.direccion}</div>` : ''}
        ${configuracionEmpresa?.telefono ? `<div class="info">Teléfono: ${configuracionEmpresa.telefono}</div>` : ''}
    </div>
    <div class="header">
        <h1>Reporte Diario</h1>
        <h2>${new Date(data.fecha).toLocaleDateString('es-CO', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</h2>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Ingresos Totales</h3>
            <div class="amount positive">${formatCurrency(data.totalVentas)}</div>
            <small>${data.totalTransacciones} transacciones</small>
        </div>
        <div class="summary-card">
            <h3>Gastos Totales</h3>
            <div class="amount negative">${formatCurrency(data.totalGastos)}</div>
            <small>${data.gastos.length} gastos</small>
        </div>
        <div class="summary-card">
            <h3>Ganancia Neta</h3>
            <div class="amount ${data.ganancia >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.ganancia)}</div>
        </div>
    </div>

    <div class="section">
        <h2>Desglose por Método de Pago</h2>
        <div class="summary">
            <div class="summary-card">
                <h3>Efectivo</h3>
                <div class="amount">${formatCurrency(data.ventasEfectivo)}</div>
            </div>
            <div class="summary-card">
                <h3>Tarjeta</h3>
                <div class="amount">${formatCurrency(data.ventasTarjeta)}</div>
            </div>
            <div class="summary-card">
                <h3>Transferencia</h3>
                <div class="amount">${formatCurrency(data.ventasTransferencia)}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Detalle de Operaciones</h2>
        <div class="transactions">
            <div class="transaction-list">
                <h3>Ventas Locales (${data.ventasLocales})</h3>
                ${data.ventas.map(venta => `
                    <div class="transaction-item">
                        <span>Cliente: ${venta.cliente?.nombre || 'Cliente General'}</span>
                        <span class="amount positive">${formatCurrency(venta.total)}</span>
                        <br><small>${formatDateTime(venta.timestamp)} - ${venta.metodoPago}</small>
                    </div>
                `).join('')}
            </div>
            
            <div class="transaction-list">
                <h3>Delivery (${data.delivery})</h3>
                ${data.ordenes.map(orden => `
                    <div class="transaction-item">
                        <span>${orden.cliente}</span>
                        <span class="amount positive">${formatCurrency(orden.total)}</span>
                        <br><small>${formatDateTime(orden.timestamp)} - ${orden.metodoPago}</small>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    ${data.conduces && data.conduces.length > 0 ? `
    <div class="section">
        <h2>Ventas a Crédito (${data.conduces.length})</h2>
        <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #007bff;">
            <strong>Total en Crédito: ${formatCurrency(data.totalCreditos || 0)}</strong>
        </div>
        ${data.conduces.map(conduce => `
            <div class="transaction-item" style="border-left: 3px solid #ffc107; background-color: #fff9e6;">
                <span><strong>Conduce:</strong> ${conduce.numero}</span>
                <span class="amount" style="color: #856404;">${formatCurrency(conduce.total)}</span>
                <br><small><strong>Cliente:</strong> ${conduce.cliente} | <strong>Estado:</strong> ${conduce.estado}</small>
                ${conduce.productos && conduce.productos.length > 0 ? `
                    <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                        <strong>Productos:</strong>
                        ${conduce.productos.map(p => `${p.cantidad}x ${p.descripcion} (${formatCurrency(p.total)})`).join(', ')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${data.facturas && data.facturas.length > 0 ? `
    <div class="section">
        <h2>Facturas del Día (${data.facturas.length})</h2>
        <div style="margin-bottom: 15px; padding: 10px; background-color: #e8f5e8; border-left: 4px solid #28a745;">
            <strong>Total Facturado: ${formatCurrency(data.totalFacturas || 0)}</strong>
            <small style="display: block; margin-top: 5px; color: #666;">
                ✅ Estas facturas YA están incluidas en los totales de métodos de pago
            </small>
        </div>
        ${data.facturas.map(factura => `
            <div class="transaction-item" style="border-left: 3px solid #28a745; background-color: #f8fff8;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span><strong>Factura:</strong> ${factura.numero}</span>
                        <span style="margin-left: 10px; padding: 2px 6px; background-color: ${factura.tipoComprobante === 'FACTURA' ? '#007bff' : '#6c757d'}; color: white; border-radius: 3px; font-size: 0.8em;">
                            ${factura.tipoComprobante}
                        </span>
                        ${factura.rnc ? `<span style="margin-left: 5px; color: #007bff; font-size: 0.9em;">📋 RNC</span>` : ''}
                    </div>
                    <span class="amount positive">${formatCurrency(factura.total)}</span>
                </div>
                <br><small>
                    <strong>Cliente:</strong> ${factura.cliente} | 
                    <strong>Método:</strong> ${factura.metodoPago} | 
                    <strong>Fecha:</strong> ${formatDateTime(factura.fechaEmision)}
                </small>
                ${factura.productos && factura.productos.length > 0 ? `
                    <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                        <strong>Productos:</strong>
                        ${factura.productos.slice(0, 3).map(p => `${p.cantidad}x ${p.descripcion}`).join(', ')}${factura.productos.length > 3 ? ` (+${factura.productos.length - 3} más)` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>Gastos del Día</h2>
        ${data.gastos.map(gasto => `
            <div class="transaction-item">
                <span>${gasto.descripcion || gasto.concepto}</span>
                <span class="amount negative">${formatCurrency(gasto.monto)}</span>
                <br><small>${formatDateTime(gasto.timestamp)}</small>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Cuadre de Caja</h2>
        <div class="summary">
            <div class="summary-card">
                <h3>Monto Inicial</h3>
                <div class="amount">${formatCurrency(data.montoInicial)}</div>
            </div>
            <div class="summary-card">
                <h3>Total en Caja</h3>
                <div class="amount">${formatCurrency(data.montoInicial + data.ganancia)}</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Reporte generado el ${new Date().toLocaleString('es-CO')} | Sistema de Gestión Comedor</p>
    </div>
</body>
</html>`;
}

module.exports = {
  async diario(req, res) {
    try {
      const fecha = req.params.fecha;
      const datosAdicionales = req.body; // Datos enviados desde el frontend
      console.log(`[REPORTE] Generando reporte diario para la fecha: ${fecha}`);
      
      // Convertir fecha local a rango UTC para consultas (igual que en gastoController)
      const startLocal = new Date(fecha + 'T00:00:00');
      const endLocal = new Date(fecha + 'T23:59:59.999');
      const start = new Date(startLocal.toISOString());
      const end = new Date(endLocal.toISOString());
      
      console.log(`[REPORTE] Consultando datos entre ${start.toISOString()} y ${end.toISOString()}`);
      
      // Obtener datos en paralelo incluyendo conduces, facturas y configuración de empresa
      const [ventas, gastos, ordenes, conduces, facturas, montoInicialDoc, configuracionEmpresa] = await Promise.all([
        Venta.find({ 
          fecha: { $gte: start, $lte: end },
          estado: { $ne: 'anulada' }
        }).populate('cliente', 'nombre'),
        
        Gasto.find({ 
          timestamp: { $gte: start, $lte: end }
        }),
        
        Orden.find({ 
          timestamp: { $gte: start, $lte: end },
          anulada: { $ne: true }
        }),
        
        Conduce.find({ 
          fechaCreacion: { $gte: start, $lte: end }
        }).populate('cliente', 'nombre'),
        
        Factura.find({ 
          fechaEmision: { $gte: start, $lte: end },
          anulada: { $ne: true }
        }).populate('cliente', 'nombre'),
        
        MontoInicial.findOne({ fecha }),
        
        ConfiguracionEmpresa.findOne().catch(error => {
          console.warn('[REPORTE] Error cargando configuración de empresa, usando valores por defecto:', error);
          return {
            nombre: 'COMEDOR & DELIVERY',
            direccion: 'Tu Dirección Aquí',
            telefono: '(809) 123-4567',
            rnc: '123456789'
          };
        })
      ]);
      
      console.log(`[REPORTE] Datos encontrados: ${ventas.length} ventas, ${gastos.length} gastos, ${ordenes.length} órdenes, ${conduces.length} conduces, ${facturas.length} facturas`);
      
      // Calcular totales
      const totalVentasLocal = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);
      const totalVentasDelivery = ordenes.reduce((sum, orden) => sum + (orden.total || 0), 0);
      const totalCreditos = conduces.reduce((sum, conduce) => sum + (conduce.total || 0), 0);
      const totalFacturas = facturas.reduce((sum, factura) => sum + (factura.total || 0), 0);
      const totalVentas = totalVentasLocal + totalVentasDelivery + totalFacturas; // Incluir facturas en el total
      const totalGastos = gastos.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
      const montoInicial = montoInicialDoc ? montoInicialDoc.monto : 0;
      const ganancia = totalVentas - totalGastos;
      
      // Calcular desglose por método de pago (incluir facturas)
      const ventasEfectivo = [...ventas, ...ordenes, ...facturas]
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + (item.total || 0), 0);
      
      const ventasTarjeta = [...ventas, ...ordenes, ...facturas]
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + (item.total || 0), 0);
      
      const ventasTransferencia = [...ventas, ...ordenes, ...facturas]
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + (item.total || 0), 0);
      
      // Preparar datos para el template
      const reportData = {
        fecha,
        ventas: ventas.map(v => ({
          cliente: v.cliente,
          total: v.total || 0,
          metodoPago: v.metodoPago || 'efectivo',
          timestamp: v.fecha
        })),
        gastos: gastos.map(g => ({
          descripcion: g.descripcion,
          concepto: g.concepto,
          monto: g.monto || 0,
          timestamp: g.timestamp
        })),
        ordenes: ordenes.map(o => ({
          cliente: o.cliente,
          total: o.total || 0,
          metodoPago: o.metodoPago || 'efectivo',
          timestamp: o.timestamp
        })),
        conduces: conduces.map(c => ({
          numero: c.numero,
          cliente: c.cliente?.nombre || 'Cliente no especificado',
          total: c.total || 0,
          estado: c.estado,
          productos: c.productos || []
        })),
        facturas: facturas.map(f => ({
          numero: f.numero,
          cliente: f.cliente?.nombre || 'Cliente no especificado',
          total: f.total || 0,
          subtotal: f.subtotal || 0,
          tipoComprobante: f.tipoComprobante || 'BOLETA',
          metodoPago: f.metodoPago || 'transferencia',
          fechaEmision: f.fechaEmision,
          rnc: f.rnc || null,
          productos: f.productos || []
        })),
        totalVentas,
        totalGastos,
        totalCreditos,
        totalFacturas,
        ganancia,
        montoInicial,
        ventasEfectivo,
        ventasTarjeta,
        ventasTransferencia,
        ventasLocales: ventas.length,
        delivery: ordenes.length,
        totalTransacciones: ventas.length + ordenes.length + facturas.length
      };
      
      console.log(`[REPORTE] Resumen: Ingresos: ${totalVentas}, Gastos: ${totalGastos}, Ganancia: ${ganancia}`);
      
      const htmlContent = generateReportHTML(reportData, configuracionEmpresa);
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--no-first-run',
          '--disable-default-apps'
        ]
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      await browser.close();
      const fechaFileName = fecha.replace(/-/g, '');
      console.log(`[REPORTE] PDF generado para la fecha: ${fecha}`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-diario-${fechaFileName}.pdf"`);
      res.send(pdf);
    } catch (error) {
      console.error('[REPORTE][ERROR] al generar reporte diario:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
