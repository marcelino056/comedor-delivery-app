const puppeteer = require('puppeteer');
const MontoInicial = require('../models/MontoInicial');
const Venta = require('../models/Venta');
const Gasto = require('../models/Gasto');
const Orden = require('../models/Orden');
const path = require('path');
const fs = require('fs');

function generateReportHTML(data) {
  // Copiado de server.js
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
  // ...HTML template copiado de server.js...
  // Por brevedad, aquí solo se muestra el encabezado:
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte Diario - ${data.fecha}</title>...resto del HTML...`;
}

module.exports = {
  async diario(req, res) {
    try {
      const fecha = req.params.fecha;
      console.log(`[REPORTE] Generando reporte diario para la fecha: ${fecha}`);
      // Lógica para obtener datos de ventas, gastos, ordenes, etc. (igual que en server.js)
      // ...
      const htmlContent = generateReportHTML({ /* datos */ });
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
