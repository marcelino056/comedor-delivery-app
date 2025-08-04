/**
 * Utilidades para limpieza de base de datos
 * ATENCIÓN: Estas funciones eliminan datos de forma permanente
 * Usar con extrema precaución en producción
 */

const mongoose = require('mongoose');
const Venta = require('../models/Venta');
const Orden = require('../models/Orden');
const Cliente = require('../models/Cliente');
const Factura = require('../models/Factura');
const Conduce = require('../models/Conduce');
const Gasto = require('../models/Gasto');
const MontoInicial = require('../models/MontoInicial');
const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');
const ConfiguracionRNC = require('../models/ConfiguracionRNC');

/**
 * Conecta a la base de datos si no está conectada
 */
async function ensureConnection() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/comedor');
        console.log('✅ Conectado a MongoDB');
    }
}

/**
 * Limpia todas las ventas
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarVentas(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todas las ventas');
    }
    
    await ensureConnection();
    const result = await Venta.deleteMany({});
    console.log(`🗑️ Eliminadas ${result.deletedCount} ventas`);
    return result;
}

/**
 * Limpia todas las órdenes de delivery
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarOrdenes(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todas las órdenes');
    }
    
    await ensureConnection();
    const result = await Orden.deleteMany({});
    console.log(`🗑️ Eliminadas ${result.deletedCount} órdenes`);
    return result;
}

/**
 * Limpia todos los clientes
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarClientes(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todos los clientes');
    }
    
    await ensureConnection();
    const result = await Cliente.deleteMany({});
    console.log(`🗑️ Eliminados ${result.deletedCount} clientes`);
    return result;
}

/**
 * Limpia todas las facturas
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarFacturas(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todas las facturas');
    }
    
    await ensureConnection();
    const result = await Factura.deleteMany({});
    console.log(`🗑️ Eliminadas ${result.deletedCount} facturas`);
    return result;
}

/**
 * Limpia todos los conduces (créditos)
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarConduces(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todos los conduces');
    }
    
    await ensureConnection();
    const result = await Conduce.deleteMany({});
    console.log(`🗑️ Eliminados ${result.deletedCount} conduces`);
    return result;
}

/**
 * Limpia todos los gastos
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarGastos(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todos los gastos');
    }
    
    await ensureConnection();
    const result = await Gasto.deleteMany({});
    console.log(`🗑️ Eliminados ${result.deletedCount} gastos`);
    return result;
}

/**
 * Limpia todos los montos iniciales
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarMontosIniciales(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de todos los montos iniciales');
    }
    
    await ensureConnection();
    const result = await MontoInicial.deleteMany({});
    console.log(`🗑️ Eliminados ${result.deletedCount} montos iniciales`);
    return result;
}

/**
 * Limpia solo los datos transaccionales (ventas, órdenes, gastos, conduces, facturas)
 * Mantiene clientes y configuraciones
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarDatosTransaccionales(confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación de datos transaccionales');
    }
    
    await ensureConnection();
    
    console.log('🧹 Iniciando limpieza de datos transaccionales...');
    
    const ventas = await Venta.deleteMany({});
    console.log(`🗑️ Eliminadas ${ventas.deletedCount} ventas`);
    
    const ordenes = await Orden.deleteMany({});
    console.log(`🗑️ Eliminadas ${ordenes.deletedCount} órdenes`);
    
    const facturas = await Factura.deleteMany({});
    console.log(`🗑️ Eliminadas ${facturas.deletedCount} facturas`);
    
    const conduces = await Conduce.deleteMany({});
    console.log(`🗑️ Eliminados ${conduces.deletedCount} conduces`);
    
    const gastos = await Gasto.deleteMany({});
    console.log(`🗑️ Eliminados ${gastos.deletedCount} gastos`);
    
    const montos = await MontoInicial.deleteMany({});
    console.log(`🗑️ Eliminados ${montos.deletedCount} montos iniciales`);
    
    // Resetear saldos de clientes a 0
    const clientesUpdate = await Cliente.updateMany({}, { saldoPendiente: 0 });
    console.log(`🔄 Reseteados saldos de ${clientesUpdate.modifiedCount} clientes`);
    
    console.log('✅ Limpieza de datos transaccionales completada');
    
    return {
        ventas: ventas.deletedCount,
        ordenes: ordenes.deletedCount,
        facturas: facturas.deletedCount,
        conduces: conduces.deletedCount,
        gastos: gastos.deletedCount,
        montos: montos.deletedCount,
        clientesReseteados: clientesUpdate.modifiedCount
    };
}

/**
 * Limpia TODOS los datos (¡PELIGROSO!)
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 * @param {string} safetyCode - Debe ser "CONFIRMO_ELIMINAR_TODO" para confirmar
 */
async function limpiarTodo(confirm = false, safetyCode = '') {
    if (!confirm || safetyCode !== 'CONFIRMO_ELIMINAR_TODO') {
        throw new Error('Debes pasar confirm=true y safetyCode="CONFIRMO_ELIMINAR_TODO" para confirmar la eliminación TOTAL');
    }
    
    await ensureConnection();
    
    console.log('🚨 INICIANDO ELIMINACIÓN TOTAL DE LA BASE DE DATOS...');
    
    const ventas = await Venta.deleteMany({});
    console.log(`🗑️ Eliminadas ${ventas.deletedCount} ventas`);
    
    const ordenes = await Orden.deleteMany({});
    console.log(`🗑️ Eliminadas ${ordenes.deletedCount} órdenes`);
    
    const facturas = await Factura.deleteMany({});
    console.log(`🗑️ Eliminadas ${facturas.deletedCount} facturas`);
    
    const conduces = await Conduce.deleteMany({});
    console.log(`🗑️ Eliminados ${conduces.deletedCount} conduces`);
    
    const gastos = await Gasto.deleteMany({});
    console.log(`🗑️ Eliminados ${gastos.deletedCount} gastos`);
    
    const montos = await MontoInicial.deleteMany({});
    console.log(`🗑️ Eliminados ${montos.deletedCount} montos iniciales`);
    
    const clientes = await Cliente.deleteMany({});
    console.log(`🗑️ Eliminados ${clientes.deletedCount} clientes`);
    
    const configEmpresa = await ConfiguracionEmpresa.deleteMany({});
    console.log(`🗑️ Eliminadas ${configEmpresa.deletedCount} configuraciones de empresa`);
    
    const configRNC = await ConfiguracionRNC.deleteMany({});
    console.log(`🗑️ Eliminadas ${configRNC.deletedCount} configuraciones RNC`);
    
    console.log('🚨 ELIMINACIÓN TOTAL COMPLETADA');
    
    return {
        ventas: ventas.deletedCount,
        ordenes: ordenes.deletedCount,
        facturas: facturas.deletedCount,
        conduces: conduces.deletedCount,
        gastos: gastos.deletedCount,
        montos: montos.deletedCount,
        clientes: clientes.deletedCount,
        configEmpresa: configEmpresa.deletedCount,
        configRNC: configRNC.deletedCount
    };
}

/**
 * Limpia datos de un rango de fechas específico
 * @param {string} fechaInicio - Fecha inicio YYYY-MM-DD
 * @param {string} fechaFin - Fecha fin YYYY-MM-DD
 * @param {boolean} confirm - Debe ser true para confirmar la acción
 */
async function limpiarPorFechas(fechaInicio, fechaFin, confirm = false) {
    if (!confirm) {
        throw new Error('Debes pasar confirm=true para confirmar la eliminación por fechas');
    }
    
    if (!fechaInicio || !fechaFin) {
        throw new Error('Debes proporcionar fechaInicio y fechaFin en formato YYYY-MM-DD');
    }
    
    await ensureConnection();
    
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59.999');
    
    console.log(`🧹 Limpiando datos desde ${fechaInicio} hasta ${fechaFin}...`);
    
    const ventas = await Venta.deleteMany({ 
        fecha: { $gte: inicio, $lte: fin } 
    });
    console.log(`🗑️ Eliminadas ${ventas.deletedCount} ventas`);
    
    const ordenes = await Orden.deleteMany({ 
        timestamp: { $gte: inicio, $lte: fin } 
    });
    console.log(`🗑️ Eliminadas ${ordenes.deletedCount} órdenes`);
    
    const gastos = await Gasto.deleteMany({ 
        timestamp: { $gte: inicio, $lte: fin } 
    });
    console.log(`🗑️ Eliminados ${gastos.deletedCount} gastos`);
    
    const facturas = await Factura.deleteMany({ 
        fechaEmision: { $gte: inicio, $lte: fin } 
    });
    console.log(`🗑️ Eliminadas ${facturas.deletedCount} facturas`);
    
    const conduces = await Conduce.deleteMany({ 
        fecha: { $gte: inicio, $lte: fin } 
    });
    console.log(`🗑️ Eliminados ${conduces.deletedCount} conduces`);
    
    console.log(`✅ Limpieza por fechas completada`);
    
    return {
        ventas: ventas.deletedCount,
        ordenes: ordenes.deletedCount,
        gastos: gastos.deletedCount,
        facturas: facturas.deletedCount,
        conduces: conduces.deletedCount
    };
}

/**
 * Muestra estadísticas de la base de datos
 */
async function mostrarEstadisticas() {
    await ensureConnection();
    
    const stats = {
        ventas: await Venta.countDocuments(),
        ordenes: await Orden.countDocuments(),
        clientes: await Cliente.countDocuments(),
        facturas: await Factura.countDocuments(),
        conduces: await Conduce.countDocuments(),
        gastos: await Gasto.countDocuments(),
        montosIniciales: await MontoInicial.countDocuments(),
        configuracionesEmpresa: await ConfiguracionEmpresa.countDocuments(),
        configuracionesRNC: await ConfiguracionRNC.countDocuments()
    };
    
    console.log('📊 ESTADÍSTICAS DE LA BASE DE DATOS:');
    console.log(`   Ventas: ${stats.ventas}`);
    console.log(`   Órdenes: ${stats.ordenes}`);
    console.log(`   Clientes: ${stats.clientes}`);
    console.log(`   Facturas: ${stats.facturas}`);
    console.log(`   Conduces: ${stats.conduces}`);
    console.log(`   Gastos: ${stats.gastos}`);
    console.log(`   Montos Iniciales: ${stats.montosIniciales}`);
    console.log(`   Config. Empresa: ${stats.configuracionesEmpresa}`);
    console.log(`   Config. RNC: ${stats.configuracionesRNC}`);
    
    return stats;
}

module.exports = {
    limpiarVentas,
    limpiarOrdenes,
    limpiarClientes,
    limpiarFacturas,
    limpiarConduces,
    limpiarGastos,
    limpiarMontosIniciales,
    limpiarDatosTransaccionales,
    limpiarTodo,
    limpiarPorFechas,
    mostrarEstadisticas
};
