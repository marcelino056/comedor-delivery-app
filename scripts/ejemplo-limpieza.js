#!/usr/bin/env node

/**
 * Ejemplo de uso del sistema de limpieza de base de datos
 * Este script demuestra el uso seguro de las funciones de limpieza
 */

const {
    limpiarDatosTransaccionales,
    mostrarEstadisticas,
    limpiarPorFechas
} = require('../utils/cleanDatabase');

async function ejemploUsoSeguro() {
    console.log('🧹 EJEMPLO DE USO SEGURO DEL SISTEMA DE LIMPIEZA\n');
    
    try {
        // 1. Mostrar estadísticas antes
        console.log('📊 ESTADÍSTICAS ANTES:');
        const statsAntes = await mostrarEstadisticas();
        console.log('');
        
        // 2. Preguntar al usuario qué hacer
        console.log('¿Qué operación quieres realizar?');
        console.log('1. Limpiar datos transaccionales (mantiene clientes)');
        console.log('2. Limpiar datos de fecha específica');
        console.log('3. Solo mostrar estadísticas');
        console.log('');
        
        // Simular selección para este ejemplo
        const operacion = process.argv[2] || '3';
        
        switch (operacion) {
            case '1':
                console.log('🧹 Limpiando datos transaccionales...');
                // NOTA: En un caso real, pedirías confirmación del usuario
                const resultado = await limpiarDatosTransaccionales(true);
                console.log('✅ Resultado:', resultado);
                break;
                
            case '2':
                const fecha = process.argv[3] || '2025-08-01';
                console.log(`🧹 Limpiando datos del ${fecha}...`);
                const resultadoFecha = await limpiarPorFechas(fecha, fecha, true);
                console.log('✅ Resultado:', resultadoFecha);
                break;
                
            case '3':
            default:
                console.log('📊 Solo mostrando estadísticas (operación segura)');
                break;
        }
        
        // 3. Mostrar estadísticas después
        if (operacion !== '3') {
            console.log('\n📊 ESTADÍSTICAS DESPUÉS:');
            await mostrarEstadisticas();
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Función de ayuda
function mostrarAyuda() {
    console.log(`
🧹 EJEMPLO DE USO DEL SISTEMA DE LIMPIEZA

Uso:
  node scripts/ejemplo-limpieza.js [operacion] [fecha]

Operaciones:
  1 - Limpiar datos transaccionales
  2 - Limpiar por fecha (requiere fecha)
  3 - Solo mostrar estadísticas (por defecto)

Ejemplos:
  node scripts/ejemplo-limpieza.js 3                    # Solo estadísticas
  node scripts/ejemplo-limpieza.js 1                    # Limpiar transaccional
  node scripts/ejemplo-limpieza.js 2 2025-08-01         # Limpiar fecha específica

⚠️ ADVERTENCIA: Las operaciones 1 y 2 eliminan datos permanentemente
`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    if (process.argv.includes('--help')) {
        mostrarAyuda();
    } else {
        ejemploUsoSeguro();
    }
}

module.exports = { ejemploUsoSeguro };
