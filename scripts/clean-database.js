#!/usr/bin/env node

/**
 * Script para ejecutar funciones de limpieza de base de datos
 * 
 * Uso:
 * node scripts/clean-database.js --help
 * node scripts/clean-database.js --stats
 * node scripts/clean-database.js --clean-ventas --confirm
 * node scripts/clean-database.js --clean-transaccional --confirm
 * node scripts/clean-database.js --clean-fechas 2025-08-01 2025-08-03 --confirm
 */

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

const args = process.argv.slice(2);

function showHelp() {
    console.log(`
🧹 HERRAMIENTA DE LIMPIEZA DE BASE DE DATOS

COMANDOS DISPONIBLES:

📊 Estadísticas:
   --stats                           Muestra estadísticas de la BD

🗑️ Limpieza por tabla (requiere --confirm):
   --clean-ventas                    Elimina todas las ventas
   --clean-ordenes                   Elimina todas las órdenes
   --clean-clientes                  Elimina todos los clientes
   --clean-facturas                  Elimina todas las facturas
   --clean-conduces                  Elimina todos los conduces
   --clean-gastos                    Elimina todos los gastos
   --clean-montos                    Elimina todos los montos iniciales

🧹 Limpieza masiva (requiere --confirm):
   --clean-transaccional             Elimina datos transaccionales (mantiene clientes y config)
   --clean-todo --safety-code        Elimina TODO (requiere código de seguridad)

📅 Limpieza por fechas (requiere --confirm):
   --clean-fechas INICIO FIN         Elimina datos entre fechas (YYYY-MM-DD)

⚠️ OPCIONES DE SEGURIDAD:
   --confirm                         Confirma la operación (requerido para eliminar)
   --safety-code CODIGO              Código para operaciones peligrosas

EJEMPLOS:
   node scripts/clean-database.js --stats
   node scripts/clean-database.js --clean-ventas --confirm
   node scripts/clean-database.js --clean-transaccional --confirm
   node scripts/clean-database.js --clean-fechas 2025-08-01 2025-08-03 --confirm
   node scripts/clean-database.js --clean-todo --confirm --safety-code CONFIRMO_ELIMINAR_TODO

⚠️  ADVERTENCIA: Las operaciones de eliminación son IRREVERSIBLES.
    Siempre haz un backup antes de usar en producción.
`);
}

async function executeCommand() {
    try {
        const hasConfirm = args.includes('--confirm');
        
        if (args.includes('--help') || args.length === 0) {
            showHelp();
            return;
        }
        
        if (args.includes('--stats')) {
            await mostrarEstadisticas();
            return;
        }
        
        if (args.includes('--clean-ventas')) {
            await limpiarVentas(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-ordenes')) {
            await limpiarOrdenes(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-clientes')) {
            await limpiarClientes(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-facturas')) {
            await limpiarFacturas(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-conduces')) {
            await limpiarConduces(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-gastos')) {
            await limpiarGastos(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-montos')) {
            await limpiarMontosIniciales(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-transaccional')) {
            await limpiarDatosTransaccionales(hasConfirm);
            return;
        }
        
        if (args.includes('--clean-todo')) {
            const safetyCodeIndex = args.indexOf('--safety-code');
            const safetyCode = safetyCodeIndex !== -1 ? args[safetyCodeIndex + 1] : '';
            await limpiarTodo(hasConfirm, safetyCode);
            return;
        }
        
        if (args.includes('--clean-fechas')) {
            const fechasIndex = args.indexOf('--clean-fechas');
            const fechaInicio = args[fechasIndex + 1];
            const fechaFin = args[fechasIndex + 2];
            
            if (!fechaInicio || !fechaFin) {
                console.error('❌ Error: Debes proporcionar fecha inicio y fin');
                console.log('Ejemplo: --clean-fechas 2025-08-01 2025-08-03');
                return;
            }
            
            await limpiarPorFechas(fechaInicio, fechaFin, hasConfirm);
            return;
        }
        
        console.error('❌ Comando no reconocido. Usa --help para ver las opciones disponibles.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    executeCommand();
}

module.exports = { executeCommand };
