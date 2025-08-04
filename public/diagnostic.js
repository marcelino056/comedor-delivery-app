/**
 * Aplicación Principal - VERSIÓN DE DIAGNÓSTICO
 * Sistema de gestión para restaurantes y delivery
 */

console.log('🚀 [DEBUG] Iniciando diagnóstico de carga...');

// Función de diagnóstico de módulos
async function diagnosticarModulos() {
    console.log('📦 [DEBUG] Iniciando diagnóstico de módulos...');
    
    const modulos = [
        'state.js',
        'api.js', 
        'ui.js',
        'websocket.js',
        'ventas.js',
        'ordenes.js',
        'gastos.js',
        'clientes.js',
        'facturas.js',
        'creditos.js',
        'configuracion.js',
        'modales.js'
    ];
    
    for (const modulo of modulos) {
        try {
            console.log(`🔄 [DEBUG] Cargando ${modulo}...`);
            await cargarModuloIndividual(modulo);
            console.log(`✅ [DEBUG] ${modulo} cargado exitosamente`);
            
            // Esperar 100ms para permitir registro
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verificar si el módulo se registró correctamente
            const nombreModulo = modulo.replace('.js', '');
            const nombreModuloCapitalizado = nombreModulo.charAt(0).toUpperCase() + nombreModulo.slice(1) + 'Module';
            
            if (window[nombreModuloCapitalizado]) {
                console.log(`✅ [DEBUG] ${nombreModuloCapitalizado} registrado correctamente`);
                
                // Para UIModule, verificar setupEventListeners específicamente
                if (nombreModuloCapitalizado === 'UIModule') {
                    console.log(`🔍 [DEBUG] Verificando UIModule.setupEventListeners...`);
                    console.log(`🔍 [DEBUG] UIModule keys:`, Object.keys(window.UIModule));
                    console.log(`🔍 [DEBUG] setupEventListeners type:`, typeof window.UIModule.setupEventListeners);
                    
                    if (typeof window.UIModule.setupEventListeners === 'function') {
                        console.log(`✅ [DEBUG] UIModule.setupEventListeners está disponible`);
                    } else {
                        console.error(`❌ [DEBUG] UIModule.setupEventListeners NO es una función`);
                    }
                }
            } else {
                console.warn(`⚠️ [DEBUG] ${nombreModuloCapitalizado} NO se registró en window`);
            }
            
        } catch (error) {
            console.error(`❌ [DEBUG] Error cargando ${modulo}:`, error);
            throw error;
        }
    }
    
    console.log('✅ [DEBUG] Todos los módulos procesados');
    return true;
}

// Función para cargar un módulo individual
function cargarModuloIndividual(nombreModulo) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `./modules/${nombreModulo}`;
        
        script.onload = () => {
            console.log(`📜 [DEBUG] Script ${nombreModulo} ejecutado`);
            resolve(nombreModulo);
        };
        
        script.onerror = (error) => {
            console.error(`💥 [DEBUG] Error cargando script ${nombreModulo}:`, error);
            reject(new Error(`Failed to load module: ${nombreModulo}`));
        };
        
        document.head.appendChild(script);
    });
}

// Función de inicialización simplificada
async function inicializarDiagnostico() {
    try {
        console.log('🔧 [DEBUG] Iniciando inicialización...');
        
        // Verificar módulos críticos
        const modulosCriticos = ['StateModule', 'APIModule', 'UIModule'];
        
        for (const modulo of modulosCriticos) {
            if (!window[modulo]) {
                throw new Error(`Módulo crítico faltante: ${modulo}`);
            }
            console.log(`✅ [DEBUG] ${modulo} disponible`);
        }
        
        // Verificar setupEventListeners específicamente
        if (!window.UIModule || typeof window.UIModule.setupEventListeners !== 'function') {
            console.error('❌ [DEBUG] UIModule.setupEventListeners no disponible');
            console.log('🔍 [DEBUG] UIModule completo:', window.UIModule);
            throw new Error('UIModule.setupEventListeners no es una función');
        }
        
        console.log('✅ [DEBUG] setupEventListeners verificado');
        
        // Ejecutar setupEventListeners
        console.log('🎨 [DEBUG] Ejecutando setupEventListeners...');
        window.UIModule.setupEventListeners();
        console.log('✅ [DEBUG] setupEventListeners ejecutado exitosamente');
        
        console.log('🎉 [DEBUG] Inicialización completada');
        
    } catch (error) {
        console.error('💥 [DEBUG] Error en inicialización:', error);
        throw error;
    }
}

// Función principal de diagnóstico
async function ejecutarDiagnostico() {
    try {
        console.log('🚀 [DEBUG] === INICIANDO DIAGNÓSTICO COMPLETO ===');
        
        // Paso 1: Cargar módulos
        await diagnosticarModulos();
        
        // Paso 2: Esperar registros
        console.log('⏳ [DEBUG] Esperando 1 segundo para registros...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Paso 3: Verificar estado final
        console.log('🔍 [DEBUG] Estado final de módulos:');
        const modulos = ['StateModule', 'APIModule', 'UIModule', 'WebSocketModule', 'ModalesModule'];
        modulos.forEach(modulo => {
            const disponible = !!window[modulo];
            console.log(`  ${modulo}: ${disponible ? 'DISPONIBLE' : 'FALTANTE'}`);
        });
        
        // Paso 4: Inicializar
        await inicializarDiagnostico();
        
        console.log('🎉 [DEBUG] === DIAGNÓSTICO COMPLETADO EXITOSAMENTE ===');
        
        // Mostrar mensaje de éxito en la página
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: monospace;">
                <h1 style="color: green;">✅ Diagnóstico Exitoso</h1>
                <p>Todos los módulos se cargaron correctamente.</p>
                <p>UIModule.setupEventListeners está disponible y funcionando.</p>
                <button onclick="location.href='/'" style="padding: 10px 20px; font-size: 16px;">
                    Ir a la Aplicación Principal
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('💥 [DEBUG] === ERROR EN DIAGNÓSTICO ===');
        console.error(error);
        
        // Mostrar error en la página
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: monospace;">
                <h1 style="color: red;">❌ Error en Diagnóstico</h1>
                <p><strong>Error:</strong> ${error.message}</p>
                <pre style="background: #f0f0f0; padding: 20px; text-align: left; border-radius: 5px;">
${error.stack || 'No stack trace disponible'}
                </pre>
                <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">
                    Reintentar Diagnóstico
                </button>
            </div>
        `;
    }
}

// Iniciar diagnóstico cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ejecutarDiagnostico);
} else {
    ejecutarDiagnostico();
}

console.log('📱 [DEBUG] Archivo de diagnóstico cargado');
