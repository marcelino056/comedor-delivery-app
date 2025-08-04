/**
 * Aplicación Principal - Comedor & Delivery
 * Sistema de gestión para restaurantes y delivery
 * 
 * Este archivo coordina la carga y inicialización de todos los módulos
 */

console.log('🚀 Iniciando Comedor & Delivery App...');

// Configuración global de la aplicación
const APP_CONFIG = {
    version: '2.0.0',
    name: 'Comedor & Delivery',
    modules: [
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
    ]
};

// Función para cargar módulos dinámicamente
async function loadModules() {
    console.log('📦 Cargando módulos...');
    
    // Cargar módulos en orden de dependencia
    const moduleLoadOrder = [
        'state.js',      // Primero el estado
        'api.js',        // Luego la API
        'ui.js',         // Interfaz de usuario
        'websocket.js',  // WebSocket
        'modales.js',    // Sistema de modales
        'ventas.js',     // Módulos de funcionalidad
        'ordenes.js',
        'gastos.js',
        'clientes.js',
        'facturas.js',
        'creditos.js',
        'configuracion.js'
    ];
    
    for (const module of moduleLoadOrder) {
        try {
            await loadSingleModule(module);
            console.log(`✅ Módulo cargado: ${module}`);
            
            // Pequeña pausa para permitir que el módulo se registre
            await new Promise(resolve => setTimeout(resolve, 50));
            
        } catch (error) {
            console.error(`❌ Error cargando módulo ${module}:`, error);
            throw error;
        }
    }
    
    console.log('✅ Todos los módulos cargados exitosamente');
    return true;
}

// Función para cargar un módulo individual
function loadSingleModule(moduleName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `./modules/${moduleName}`;
        script.onload = () => resolve(moduleName);
        script.onerror = () => reject(new Error(`Failed to load module: ${moduleName}`));
        document.head.appendChild(script);
    });
}

// Función de inicialización principal
async function initializeApp() {
    try {
        console.log('🔧 Inicializando aplicación...');
        
        // Verificar que los módulos principales están disponibles
        const maxRetries = 50; // 5 segundos máximo
        let retries = 0;
        
        while (retries < maxRetries) {
            if (window.StateModule && window.APIModule && window.UIModule) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.StateModule || !window.APIModule || !window.UIModule) {
            throw new Error('Módulos principales no encontrados después de esperar');
        }
        
        console.log('✅ Módulos principales verificados');
        
        // Inicializar estado de la aplicación
        window.StateModule.updateCurrentDate();
        console.log('📅 Estado inicial configurado');
        
        // Configurar interfaz de usuario
        if (window.UIModule.setupEventListeners) {
            window.UIModule.setupEventListeners();
            console.log('🎨 Interfaz de usuario configurada');
        } else {
            console.warn('⚠️ setupEventListeners no disponible');
        }
        
        // Inicializar display de venta
        if (window.VentasModule && window.VentasModule.actualizarDisplayVenta) {
            window.VentasModule.actualizarDisplayVenta();
            console.log('💰 Display de venta inicializado');
        }
        
        // Configurar modales
        if (window.ModalesModule && window.ModalesModule.setupModalEventListeners) {
            window.ModalesModule.setupModalEventListeners();
            console.log('🪟 Sistema de modales configurado');
        }
        
        // Establecer conexión WebSocket
        if (window.WebSocketModule && window.WebSocketModule.connectWebSocket) {
            window.WebSocketModule.connectWebSocket();
            console.log('🔗 WebSocket conectado');
        }
        
        // Cargar configuración de empresa
        if (window.ConfiguracionModule && window.ConfiguracionModule.cargarConfiguracionEmpresa) {
            try {
                await window.ConfiguracionModule.cargarConfiguracionEmpresa();
                console.log('🏢 Configuración de empresa cargada');
            } catch (error) {
                console.warn('⚠️ Error cargando configuración de empresa:', error);
            }
        }
        
        // Cargar datos iniciales
        if (window.APIModule.loadInitialData) {
            try {
                await window.APIModule.loadInitialData();
                console.log('📊 Datos iniciales cargados');
            } catch (error) {
                console.warn('⚠️ Error cargando datos iniciales:', error);
            }
        }
        
        // Mostrar pestaña inicial
        if (window.UIModule.switchTab) {
            window.UIModule.switchTab('ventas');
            console.log('🏠 Pestaña inicial activada');
        }
        
        console.log('🎉 Aplicación inicializada exitosamente');
        
        // Mostrar notificación de bienvenida
        setTimeout(() => {
            if (window.notify && window.notify.success) {
                window.notify.success('¡Bienvenido a Comedor & Delivery!');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        
        // Mostrar error al usuario
        const errorDiv = document.createElement('div');
        errorDiv.className = 'init-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>Error de Inicialización</h2>
                <p>Hubo un problema al cargar la aplicación:</p>
                <code>${error.message}</code>
                <button onclick="location.reload()">Recargar Página</button>
            </div>
        `;
        
        // Agregar estilos de error
        const errorStyles = document.createElement('style');
        errorStyles.textContent = `
            .init-error {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .error-content {
                background: #1a1a1a;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            .error-content h2 {
                color: #ef4444;
                margin-top: 0;
            }
            .error-content code {
                background: #2a2a2a;
                padding: 1rem;
                border-radius: 6px;
                display: block;
                margin: 1rem 0;
                font-family: 'Monaco', 'Menlo', monospace;
                color: #fbbf24;
            }
            .error-content button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                margin-top: 1rem;
            }
            .error-content button:hover {
                background: #2563eb;
            }
        `;
        
        document.head.appendChild(errorStyles);
        document.body.appendChild(errorDiv);
    }
}

// Función para mostrar estado de carga
function showLoadingScreen() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'app-loading';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="loading-logo">🍽️</div>
            <h2>Comedor & Delivery</h2>
            <div class="loading-spinner"></div>
            <p>Cargando aplicación...</p>
        </div>
    `;
    
    // Agregar estilos de carga
    const loadingStyles = document.createElement('style');
    loadingStyles.textContent = `
        #app-loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .loading-content {
            text-align: center;
            animation: fadeIn 0.5s ease-out;
        }
        .loading-logo {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: bounce 2s infinite;
        }
        .loading-content h2 {
            margin: 0 0 2rem 0;
            font-size: 2rem;
            font-weight: 300;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            margin: 0 auto 1rem auto;
            animation: spin 1s linear infinite;
        }
        .loading-content p {
            margin: 0;
            opacity: 0.8;
            font-size: 1.1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    
    document.head.appendChild(loadingStyles);
    document.body.appendChild(loadingDiv);
}

// Función para ocultar pantalla de carga
function hideLoadingScreen() {
    const loadingDiv = document.getElementById('app-loading');
    if (loadingDiv) {
        loadingDiv.style.animation = 'fadeIn 0.5s ease-out reverse';
        setTimeout(() => {
            loadingDiv.remove();
        }, 500);
    }
}

// Función principal de arranque
async function bootstrap() {
    try {
        // Mostrar pantalla de carga
        showLoadingScreen();
        
        // Esperar un momento para mostrar la pantalla de carga
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Cargar módulos
        console.log('🔄 Iniciando carga de módulos...');
        const modulesLoaded = await loadModules();
        if (!modulesLoaded) {
            throw new Error('Error cargando módulos de la aplicación');
        }
        
        // Esperar un momento adicional para que los módulos se registren completamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar que los módulos críticos están disponibles
        console.log('🔍 Verificando módulos críticos...');
        const criticalModules = {
            StateModule: window.StateModule,
            APIModule: window.APIModule,
            UIModule: window.UIModule
        };
        
        for (const [name, module] of Object.entries(criticalModules)) {
            if (!module) {
                throw new Error(`Módulo crítico no disponible: ${name}`);
            }
            console.log(`✅ ${name} disponible`);
        }
        
        // Verificar setupEventListeners específicamente con múltiples intentos
        let setupEventListenersFound = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
            if (window.UIModule && typeof window.UIModule.setupEventListeners === 'function') {
                setupEventListenersFound = true;
                break;
            }
            console.log(`⏳ Intento ${attempt}/5: Esperando UIModule.setupEventListeners...`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!setupEventListenersFound) {
            console.error('❌ UIModule.setupEventListeners no disponible después de 5 intentos');
            console.log('UIModule disponible:', Object.keys(window.UIModule || {}));
            throw new Error('UIModule.setupEventListeners no es una función');
        }
        console.log('✅ UIModule.setupEventListeners verificado');
        
        // Inicializar aplicación
        await initializeApp();
        
        // Ocultar pantalla de carga
        hideLoadingScreen();
        
        console.log('🚀 Aplicación lista para usar');
        
    } catch (error) {
        console.error('💥 Error crítico durante el arranque:', error);
        hideLoadingScreen();
        
        // Mostrar error detallado
        showDetailedError(error);
    }
}

// Función para mostrar error detallado
function showDetailedError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'detailed-error';
    
    const moduleStatus = {
        StateModule: !!window.StateModule,
        APIModule: !!window.APIModule,
        UIModule: !!window.UIModule,
        WebSocketModule: !!window.WebSocketModule,
        ModalesModule: !!window.ModalesModule
    };
    
    const moduleStatusHtml = Object.entries(moduleStatus)
        .map(([name, loaded]) => `<li class="${loaded ? 'loaded' : 'missing'}">${name}: ${loaded ? 'CARGADO' : 'FALTANTE'}</li>`)
        .join('');
    
    errorDiv.innerHTML = `
        <div class="error-content">
            <h2>Error de Inicialización Detallado</h2>
            <div class="error-message">
                <strong>Error:</strong> ${error.message}
            </div>
            <div class="module-status">
                <h3>Estado de Módulos:</h3>
                <ul>${moduleStatusHtml}</ul>
            </div>
            <div class="error-stack">
                <h3>Stack Trace:</h3>
                <pre>${error.stack || 'No disponible'}</pre>
            </div>
            <div class="error-actions">
                <button onclick="location.reload()">Recargar Página</button>
                <button onclick="window.open('/debug.html', '_blank')">Abrir Debug</button>
            </div>
        </div>
    `;
    
    // Agregar estilos mejorados
    const errorStyles = document.createElement('style');
    errorStyles.textContent = `
        .detailed-error {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow-y: auto;
        }
        .error-content {
            background: #1a1a1a;
            padding: 2rem;
            border-radius: 12px;
            max-width: 600px;
            margin: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .error-content h2 {
            color: #ef4444;
            margin-top: 0;
        }
        .error-content h3 {
            color: #3b82f6;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
        }
        .error-message {
            background: #2a2a2a;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
            color: #fbbf24;
        }
        .module-status ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .module-status li {
            padding: 0.5rem;
            margin: 0.25rem 0;
            border-radius: 4px;
        }
        .module-status li.loaded {
            background: #065f46;
            color: #10b981;
        }
        .module-status li.missing {
            background: #7f1d1d;
            color: #ef4444;
        }
        .error-stack pre {
            background: #2a2a2a;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 0.875rem;
            color: #d1d5db;
        }
        .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 1.5rem;
        }
        .error-actions button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
        }
        .error-actions button:hover {
            background: #2563eb;
        }
    `;
    
    document.head.appendChild(errorStyles);
    document.body.appendChild(errorDiv);
}

// Event listener para cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    // El DOM ya está listo
    bootstrap();
}

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('❌ Error no capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
});

// Exponer información de la aplicación
window.APP_INFO = {
    version: APP_CONFIG.version,
    name: APP_CONFIG.name,
    loadedModules: () => APP_CONFIG.modules.filter(module => 
        document.querySelector(`script[src="./modules/${module}"]`)
    ),
    debug: {
        state: () => window.StateModule?.state,
        modules: () => ({
            StateModule: !!window.StateModule,
            APIModule: !!window.APIModule,
            UIModule: !!window.UIModule,
            WebSocketModule: !!window.WebSocketModule,
            VentasModule: !!window.VentasModule,
            OrdenesModule: !!window.OrdenesModule,
            GastosModule: !!window.GastosModule,
            ClientesModule: !!window.ClientesModule,
            FacturasModule: !!window.FacturasModule,
            CreditosModule: !!window.CreditosModule,
            ConfiguracionModule: !!window.ConfiguracionModule,
            ModalesModule: !!window.ModalesModule
        })
    }
};

console.log('📱 App.js cargado - Version:', APP_CONFIG.version);
