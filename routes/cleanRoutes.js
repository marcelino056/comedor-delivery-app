const express = require('express');
const router = express.Router();
const {
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
} = require('../utils/cleanDatabase');

// Middleware de seguridad (opcional: agregar autenticación aquí)
const requireAuth = (req, res, next) => {
    // Por seguridad, solo permitir en desarrollo o con clave especial
    const authKey = req.headers['x-admin-key'] || req.query.adminKey;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const validKey = process.env.ADMIN_KEY || 'admin123'; // Cambiar en producción
    
    if (!isDevelopment && authKey !== validKey) {
        return res.status(403).json({ 
            error: 'Acceso denegado. Operación solo disponible para administradores.' 
        });
    }
    
    next();
};

// Obtener estadísticas de la base de datos
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const stats = await mostrarEstadisticas();
        res.json({
            success: true,
            data: stats,
            message: 'Estadísticas obtenidas correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar ventas
router.post('/clean/ventas', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarVentas(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminadas ${result.deletedCount} ventas`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar órdenes
router.post('/clean/ordenes', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarOrdenes(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminadas ${result.deletedCount} órdenes`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar clientes
router.post('/clean/clientes', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarClientes(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminados ${result.deletedCount} clientes`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar facturas
router.post('/clean/facturas', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarFacturas(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminadas ${result.deletedCount} facturas`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar conduces
router.post('/clean/conduces', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarConduces(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminados ${result.deletedCount} conduces`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar gastos
router.post('/clean/gastos', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarGastos(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminados ${result.deletedCount} gastos`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar montos iniciales
router.post('/clean/montos', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarMontosIniciales(confirm);
        res.json({
            success: true,
            data: result,
            message: `Eliminados ${result.deletedCount} montos iniciales`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar datos transaccionales
router.post('/clean/transaccional', requireAuth, async (req, res) => {
    try {
        const { confirm } = req.body;
        const result = await limpiarDatosTransaccionales(confirm);
        res.json({
            success: true,
            data: result,
            message: 'Datos transaccionales eliminados correctamente'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar por fechas
router.post('/clean/fechas', requireAuth, async (req, res) => {
    try {
        const { fechaInicio, fechaFin, confirm } = req.body;
        const result = await limpiarPorFechas(fechaInicio, fechaFin, confirm);
        res.json({
            success: true,
            data: result,
            message: `Datos eliminados desde ${fechaInicio} hasta ${fechaFin}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar TODO (operación extremadamente peligrosa)
router.post('/clean/todo', requireAuth, async (req, res) => {
    try {
        const { confirm, safetyCode } = req.body;
        const result = await limpiarTodo(confirm, safetyCode);
        res.json({
            success: true,
            data: result,
            message: '⚠️ TODA la base de datos ha sido eliminada'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
