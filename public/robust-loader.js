/**
 * Sistema de Carga de Módulos Robusto
 * Maneja la carga secuencial y verificación de módulos
 */

// Estado del sistema de carga
const MODULE_LOADER = {
    loadedModules: new Set(),
    moduleRegistry: new Map(),
    eventEmitter: new EventTarget(),
    isReady: false
};

// Configuración de módulos con dependencias
const MODULE_CONFIG = {
    'state': { file: 'state.js', dependencies: [], globalName: 'StateModule' },
    'api': { file: 'api.js', dependencies: ['state'], globalName: 'APIModule' },
    'ui': { file: 'ui.js', dependencies: ['state'], globalName: 'UIModule' },
    'websocket': { file: 'websocket.js', dependencies: ['state'], globalName: 'WebSocketModule' },
    'modales': { file: 'modales.js', dependencies: ['state', 'api', 'ui'], globalName: 'ModalesModule' },
    'ventas': { file: 'ventas.js', dependencies: ['state', 'api', 'ui'], globalName: 'VentasModule' },
    'ordenes': { file: 'ordenes.js', dependencies: ['state', 'api', 'ui'], globalName: 'OrdenesModule' },
    'gastos': { file: 'gastos.js', dependencies: ['state', 'api', 'ui'], globalName: 'GastosModule' },
    'clientes': { file: 'clientes.js', dependencies: ['state', 'api', 'ui'], globalName: 'ClientesModule' },
    'facturas': { file: 'facturas.js', dependencies: ['state', 'api', 'ui', 'clientes'], globalName: 'FacturasModule' },
    'creditos': { file: 'creditos.js', dependencies: ['state', 'api', 'ui', 'clientes'], globalName: 'CreditosModule' },
    'configuracion': { file: 'configuracion.js', dependencies: ['state', 'api', 'ui'], globalName: 'ConfiguracionModule' }
};

// Función para cargar un módulo individual
async function loadModule(moduleName) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Cargando módulo: ${moduleName}`);
        
        const config = MODULE_CONFIG[moduleName];
        if (!config) {
            reject(new Error(`Configuración no encontrada para módulo: ${moduleName}`));
            return;
        }
        
        const script = document.createElement('script');
        script.src = `./modules/${config.file}`;
        script.setAttribute('data-module', moduleName);
        
        script.onload = () => {
            console.log(`📜 Script cargado: ${config.file}`);
            
            // Verificar que el módulo se registró correctamente
            setTimeout(() => {
                if (window[config.globalName]) {
                    console.log(`✅ Módulo registrado: ${config.globalName}`);
                    MODULE_LOADER.loadedModules.add(moduleName);
                    MODULE_LOADER.moduleRegistry.set(moduleName, window[config.globalName]);
                    
                    // Emitir evento de módulo cargado
                    MODULE_LOADER.eventEmitter.dispatchEvent(new CustomEvent('moduleLoaded', {
                        detail: { moduleName, globalName: config.globalName }
                    }));
                    
                    resolve(moduleName);
                } else {
                    reject(new Error(`Módulo no se registró en window: ${config.globalName}`));
                }
            }, 100);
        };
        
        script.onerror = (error) => {
            console.error(`💥 Error cargando ${config.file}:`, error);
            reject(new Error(`Failed to load module script: ${config.file}`));
        };
        
        document.head.appendChild(script);
    });
}

// Función para verificar dependencias
function areDependenciesLoaded(moduleName) {
    const config = MODULE_CONFIG[moduleName];
    if (!config) return false;
    
    return config.dependencies.every(dep => MODULE_LOADER.loadedModules.has(dep));
}

// Función para cargar módulos en orden de dependencias
async function loadModulesWithDependencies() {
    console.log('📦 Iniciando carga de módulos con dependencias...');
    
    const moduleNames = Object.keys(MODULE_CONFIG);
    const loadedModules = new Set();
    const maxIterations = moduleNames.length * 2; // Prevenir bucles infinitos
    let iterations = 0;
    
    while (loadedModules.size < moduleNames.length && iterations < maxIterations) {
        iterations++;
        let progressMade = false;
        
        for (const moduleName of moduleNames) {
            if (loadedModules.has(moduleName)) continue;
            
            if (areDependenciesLoaded(moduleName)) {
                try {
                    await loadModule(moduleName);
                    loadedModules.add(moduleName);
                    progressMade = true;
                    console.log(`✅ Módulo cargado: ${moduleName} (${loadedModules.size}/${moduleNames.length})`);
                } catch (error) {
                    console.error(`❌ Error cargando módulo ${moduleName}:`, error);
                    throw error;
                }
            }
        }
        
        if (!progressMade) {
            const pendingModules = moduleNames.filter(m => !loadedModules.has(m));
            console.error('❌ No se pudo hacer progreso. Módulos pendientes:', pendingModules);
            throw new Error(`Dependencias circulares o faltantes para: ${pendingModules.join(', ')}`);
        }
    }
    
    console.log('✅ Todos los módulos cargados exitosamente');
    return true;
}

// Función para verificar que todos los módulos están correctamente cargados
function verifyAllModulesLoaded() {
    console.log('🔍 Verificando carga de módulos...');
    
    const verification = {};
    
    Object.entries(MODULE_CONFIG).forEach(([moduleName, config]) => {
        const isLoaded = MODULE_LOADER.loadedModules.has(moduleName);
        const isRegistered = !!window[config.globalName];
        
        verification[moduleName] = {
            loaded: isLoaded,
            registered: isRegistered,
            globalName: config.globalName,
            status: isLoaded && isRegistered ? 'OK' : 'ERROR'
        };
        
        console.log(`${isLoaded && isRegistered ? '✅' : '❌'} ${moduleName} (${config.globalName}): ${verification[moduleName].status}`);
    });
    
    // Verificación especial para UIModule.setupEventListeners
    if (window.UIModule) {
        const hasSetupEventListeners = typeof window.UIModule.setupEventListeners === 'function';
        console.log(`${hasSetupEventListeners ? '✅' : '❌'} UIModule.setupEventListeners: ${hasSetupEventListeners ? 'DISPONIBLE' : 'FALTANTE'}`);
        verification.ui.setupEventListeners = hasSetupEventListeners;
    }
    
    const allOK = Object.values(verification).every(v => v.status === 'OK');
    console.log(`🎯 Verificación general: ${allOK ? 'EXITOSA' : 'FALLIDA'}`);
    
    return { allOK, verification };
}

// Función de inicialización principal mejorada
async function initializeApplicationRobust() {
    try {
        console.log('🚀 === INICIALIZACIÓN ROBUSTA DE LA APLICACIÓN ===');
        
        // Paso 1: Cargar módulos
        await loadModulesWithDependencies();
        
        // Paso 2: Verificar carga
        const verification = verifyAllModulesLoaded();
        if (!verification.allOK) {
            throw new Error('Algunos módulos no se cargaron correctamente');
        }
        
        // Paso 3: Inicializar estado
        if (window.StateModule && window.StateModule.updateCurrentDate) {
            window.StateModule.updateCurrentDate();
            console.log('📅 Estado inicializado');
        }
        
        // Paso 4: Configurar UI
        if (window.UIModule && window.UIModule.setupEventListeners) {
            window.UIModule.setupEventListeners();
            console.log('🎨 Event listeners configurados');
        } else {
            throw new Error('UIModule.setupEventListeners no disponible');
        }
        
        // Paso 5: Configurar modales
        if (window.ModalesModule && window.ModalesModule.setupModalEventListeners) {
            window.ModalesModule.setupModalEventListeners();
            console.log('🪟 Modales configurados');
        }
        
        // Paso 6: Conectar WebSocket
        if (window.WebSocketModule && window.WebSocketModule.connectWebSocket) {
            window.WebSocketModule.connectWebSocket();
            console.log('🔗 WebSocket conectado');
        }
        
        // Paso 7: Cargar configuración
        if (window.ConfiguracionModule && window.ConfiguracionModule.cargarConfiguracionEmpresa) {
            try {
                await window.ConfiguracionModule.cargarConfiguracionEmpresa();
                console.log('🏢 Configuración de empresa cargada');
            } catch (error) {
                console.warn('⚠️ Error cargando configuración de empresa:', error);
            }
        }
        
        // Paso 8: Cargar datos iniciales
        if (window.APIModule && window.APIModule.loadInitialData) {
            try {
                await window.APIModule.loadInitialData();
                console.log('📊 Datos iniciales cargados');
            } catch (error) {
                console.warn('⚠️ Error cargando datos iniciales:', error);
            }
        }
        
        // Paso 9: Activar pestaña inicial
        if (window.UIModule && window.UIModule.switchTab) {
            window.UIModule.switchTab('ventas');
            console.log('🏠 Pestaña inicial activada');
        }
        
        MODULE_LOADER.isReady = true;
        console.log('🎉 === APLICACIÓN INICIALIZADA EXITOSAMENTE ===');
        
        // Emitir evento de aplicación lista
        MODULE_LOADER.eventEmitter.dispatchEvent(new CustomEvent('applicationReady'));
        
        return true;
        
    } catch (error) {
        console.error('💥 === ERROR EN INICIALIZACIÓN ROBUSTA ===');
        console.error(error);
        throw error;
    }
}

// Función para mostrar estado de carga visualmente
function showLoadingStatus() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'robust-loading';
    loadingDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🍽️</div>
                <h2 style="margin: 0 0 2rem 0; font-size: 2rem; font-weight: 300;">Comedor & Delivery</h2>
                <div style="
                    width: 200px;
                    height: 4px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 2px;
                    margin: 0 auto 1rem auto;
                    overflow: hidden;
                ">
                    <div id="progress-fill" style="
                        height: 100%;
                        background: white;
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <p id="loading-status">Cargando módulos...</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Escuchar eventos de progreso
    let progress = 0;
    const totalModules = Object.keys(MODULE_CONFIG).length;
    
    MODULE_LOADER.eventEmitter.addEventListener('moduleLoaded', (event) => {
        progress++;
        const percentage = (progress / totalModules) * 100;
        
        document.getElementById('progress-fill').style.width = percentage + '%';
        document.getElementById('loading-status').textContent = 
            `Cargando módulos... ${progress}/${totalModules} (${Math.round(percentage)}%)`;
    });
    
    MODULE_LOADER.eventEmitter.addEventListener('applicationReady', () => {
        document.getElementById('progress-fill').style.width = '100%';
        document.getElementById('loading-status').textContent = '¡Aplicación lista!';
        
        setTimeout(() => {
            const loadingElement = document.getElementById('robust-loading');
            if (loadingElement) {
                loadingElement.style.opacity = '0';
                loadingElement.style.transition = 'opacity 0.5s ease';
                setTimeout(() => loadingElement.remove(), 500);
            }
        }, 1000);
    });
}

// Función principal de arranque robusto
async function bootstrapRobust() {
    try {
        // Mostrar estado de carga
        showLoadingStatus();
        
        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Inicializar aplicación
        await initializeApplicationRobust();
        
        // Mostrar notificación de éxito
        setTimeout(() => {
            if (window.notify && window.notify.success) {
                window.notify.success('¡Aplicación cargada exitosamente!');
            }
        }, 1500);
        
    } catch (error) {
        console.error('💥 Error crítico en arranque robusto:', error);
        
        // Ocultar loading
        const loadingElement = document.getElementById('robust-loading');
        if (loadingElement) loadingElement.remove();
        
        // Mostrar error detallado
        showRobustError(error);
    }
}

// Función para mostrar error robusto
function showRobustError(error) {
    const verification = verifyAllModulesLoaded();
    
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow-y: auto;
        ">
            <div style="
                background: #1a1a1a;
                padding: 2rem;
                border-radius: 12px;
                max-width: 800px;
                margin: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            ">
                <h2 style="color: #ef4444; margin-top: 0;">💥 Error de Carga de Módulos</h2>
                <div style="background: #2a2a2a; padding: 1rem; border-radius: 6px; margin: 1rem 0;">
                    <strong>Error:</strong> ${error.message}
                </div>
                <h3 style="color: #3b82f6;">Estado de Módulos:</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; margin: 1rem 0;">
                    ${Object.entries(verification.verification || {}).map(([name, info]) => `
                        <div style="
                            background: ${info.status === 'OK' ? '#065f46' : '#7f1d1d'};
                            padding: 10px;
                            border-radius: 5px;
                        ">
                            <strong>${name}</strong><br>
                            <small>${info.status}</small><br>
                            <small>Global: ${info.registered ? '✅' : '❌'}</small>
                        </div>
                    `).join('')}
                </div>
                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="location.reload()" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin: 0 0.5rem;
                    ">Recargar Página</button>
                    <button onclick="window.open('/diagnostic.html', '_blank')" style="
                        background: #059669;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin: 0 0.5rem;
                    ">Abrir Diagnóstico</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// Exponer funciones globalmente
window.MODULE_LOADER = MODULE_LOADER;
window.bootstrapRobust = bootstrapRobust;
window.verifyAllModulesLoaded = verifyAllModulesLoaded;

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapRobust);
} else {
    bootstrapRobust();
}

console.log('🔧 Sistema de carga robusto inicializado');
