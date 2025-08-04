/**
 * Script de prueba para el modal de anulación mejorado
 * Este archivo puede ser usado para probar la funcionalidad sin afectar el código principal
 */

// Función de prueba para el modal de anulación
async function testAnulacionModal() {
    console.log('🧪 Probando modal de anulación mejorado...');
    
    if (!window.elegantPrompt) {
        console.error('❌ elegantPrompt no está disponible');
        alert('Error: elegantPrompt no está disponible. Verifique que ui.js esté cargado.');
        return;
    }
    
    try {
        // Simular datos de un conduce
        const clienteNombre = 'Juan Pérez';
        const conduceTotal = '$2,500.00';
        const conduceId = 'test-123';
        
        console.log('📝 Abriendo prompt para motivo de anulación...');
        
        const motivo = await window.elegantPrompt(
            `¿Está seguro que desea anular el conduce del cliente <strong>${clienteNombre}</strong> por un valor de <strong>${conduceTotal}</strong>?<br><br>Por favor, ingrese el motivo de la anulación:`,
            '⚠️ Anular Conduce a Crédito',
            'Ej: Error en pedido, cliente canceló, producto no disponible, etc.',
            'anulacion'
        );
        
        if (!motivo || motivo.trim() === '') {
            console.log('❌ Anulación cancelada - no se proporcionó motivo');
            return;
        }
        
        if (motivo.trim().length < 10) {
            console.warn('⚠️ El motivo debe tener al menos 10 caracteres');
            if (window.notify) {
                window.notify.warning('El motivo debe tener al menos 10 caracteres');
            } else {
                alert('El motivo debe tener al menos 10 caracteres');
            }
            return;
        }
        
        console.log(`✅ Motivo ingresado: "${motivo}"`);
        
        // Confirmación adicional
        if (window.elegantConfirm) {
            console.log('🔔 Solicitando confirmación adicional...');
            
            const confirmarAnulacion = await window.elegantConfirm(
                `¿Confirma que desea anular este conduce?\n\nMotivo: "${motivo.trim()}"`,
                'Confirmar Anulación',
                'Esta acción no se puede deshacer'
            );
            
            if (!confirmarAnulacion) {
                console.log('❌ Anulación cancelada por el usuario');
                return;
            }
            
            console.log('✅ Anulación confirmada');
        }
        
        // Simular el proceso de anulación
        console.log('📡 Simulando envío al servidor...');
        
        // Mostrar notificación de éxito
        if (window.notify) {
            window.notify.success(`Conduce anulado exitosamente\nMotivo: ${motivo.trim()}`);
        } else {
            alert(`✅ Conduce anulado exitosamente!\nMotivo: ${motivo.trim()}`);
        }
        
        console.log('🎉 Prueba del modal de anulación completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba del modal:', error);
        
        if (window.notify) {
            window.notify.error(`Error en la prueba: ${error.message}`);
        } else {
            alert(`❌ Error en la prueba: ${error.message}`);
        }
    }
}

// Función de prueba simplificada para prompt básico
async function testSimplePrompt() {
    console.log('🧪 Probando prompt simple...');
    
    if (!window.elegantPrompt) {
        console.error('❌ elegantPrompt no está disponible');
        alert('Error: elegantPrompt no está disponible');
        return;
    }
    
    try {
        const resultado = await window.elegantPrompt(
            'Ingrese un texto de prueba:',
            'Prueba de Prompt',
            'Escriba algo aquí...'
        );
        
        if (resultado) {
            console.log(`✅ Texto ingresado: "${resultado}"`);
            if (window.notify) {
                window.notify.success(`Texto ingresado: "${resultado}"`);
            } else {
                alert(`✅ Texto ingresado: "${resultado}"`);
            }
        } else {
            console.log('❌ Prompt cancelado');
        }
        
    } catch (error) {
        console.error('❌ Error en el prompt:', error);
    }
}

// Función para mostrar información del sistema
function showSystemInfo() {
    console.log('📊 Información del sistema:');
    console.log('- elegantPrompt disponible:', !!window.elegantPrompt);
    console.log('- elegantConfirm disponible:', !!window.elegantConfirm);
    console.log('- notify disponible:', !!window.notify);
    console.log('- StateModule disponible:', !!window.StateModule);
    console.log('- CreditosModule disponible:', !!window.CreditosModule);
    
    // Crear un resumen visual
    const info = {
        elegantPrompt: !!window.elegantPrompt,
        elegantConfirm: !!window.elegantConfirm,
        notify: !!window.notify,
        StateModule: !!window.StateModule,
        CreditosModule: !!window.CreditosModule
    };
    
    console.table(info);
}

// Exponer funciones globalmente para pruebas
window.testAnulacionModal = testAnulacionModal;
window.testSimplePrompt = testSimplePrompt;
window.showSystemInfo = showSystemInfo;

console.log('🔧 Scripts de prueba cargados. Funciones disponibles:');
console.log('- testAnulacionModal(): Prueba completa del modal de anulación');
console.log('- testSimplePrompt(): Prueba básica del prompt');
console.log('- showSystemInfo(): Muestra información del sistema');
