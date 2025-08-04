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
    
    const modulePromises = APP_CONFIG.modules.map(module => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `./modules/${module}`;
            script.onload = () => {
                console.log(`✅ Módulo cargado: ${module}`);
                resolve(module);
            };
            script.onerror = () => {
                console.error(`❌ Error cargando módulo: ${module}`);
                reject(new Error(`Failed to load module: ${module}`));
            };
            document.head.appendChild(script);
        });
    });
    
    try {
        await Promise.all(modulePromises);
        console.log('✅ Todos los módulos cargados exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error cargando módulos:', error);
        return false;
    }
}

// Función de inicialización principal
async function initializeApp() {
    try {
        console.log('🔧 Inicializando aplicación...');
        
        // Verificar que los módulos están disponibles
        if (!window.StateModule || !window.APIModule || !window.UIModule) {
            throw new Error('Módulos principales no encontrados');
        }
        
        // Inicializar estado de la aplicación
        window.StateModule.updateCurrentDate();
        console.log('📅 Estado inicial configurado');
        
        // Configurar interfaz de usuario
        window.UIModule.setupEventListeners();
        console.log('🎨 Interfaz de usuario configurada');
        
        // Configurar modales
        if (window.ModalesModule) {
            window.ModalesModule.setupModalEventListeners();
            console.log('🪟 Sistema de modales configurado');
        }
        
        // Establecer conexión WebSocket
        if (window.WebSocketModule) {
            window.WebSocketModule.connectWebSocket();
            console.log('🔗 WebSocket conectado');
        }
        
        // Cargar configuración de empresa
        if (window.ConfiguracionModule) {
            await window.ConfiguracionModule.cargarConfiguracionEmpresa();
            console.log('🏢 Configuración de empresa cargada');
        }
        
        // Cargar datos iniciales
        if (window.APIModule.loadInitialData) {
            await window.APIModule.loadInitialData();
            console.log('📊 Datos iniciales cargados');
        }
        
        // Mostrar pestaña inicial
        window.UIModule.switchTab('ventas');
        console.log('🏠 Pestaña inicial activada');
        
        console.log('🎉 Aplicación inicializada exitosamente');
        
        // Mostrar notificación de bienvenida
        setTimeout(() => {
            if (window.notify) {
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
        const modulesLoaded = await loadModules();
        if (!modulesLoaded) {
            throw new Error('Error cargando módulos de la aplicación');
        }
        
        // Esperar un momento para que los módulos se registren
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Inicializar aplicación
        await initializeApp();
        
        // Ocultar pantalla de carga
        hideLoadingScreen();
        
        console.log('🚀 Aplicación lista para usar');
        
    } catch (error) {
        console.error('💥 Error crítico durante el arranque:', error);
        hideLoadingScreen();
        throw error;
    }
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
