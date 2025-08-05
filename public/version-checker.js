// Función para verificar actualizaciones de versión contra el servidor
async function checkServerVersion() {
    try {
        const response = await fetch('/api/version');
        const serverVersion = await response.json();
        
        // Obtener versión local del service worker
        const localVersion = localStorage.getItem('app_version');
        
        console.log('Versión del servidor:', serverVersion.version);
        console.log('Versión local:', localVersion || 'no guardada');
        
        // Si hay una nueva versión disponible
        if (localVersion && localVersion !== serverVersion.version) {
            console.log('Nueva versión detectada del servidor');
            showUpdateNotification();
        }
        
        // Guardar versión actual
        localStorage.setItem('app_version', serverVersion.version);
        
        return serverVersion;
    } catch (error) {
        console.error('Error verificando versión del servidor:', error);
        return null;
    }
}

// Función para mostrar notificación de actualización disponible
function showUpdateNotification() {
    if (document.getElementById('update-notification')) {
        return; // Ya hay una notificación visible
    }
    
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideIn 0.3s ease-out;
        ">
            <div style="font-weight: bold; margin-bottom: 8px;">
                🚀 Nueva versión disponible
            </div>
            <div style="font-size: 14px; margin-bottom: 12px;">
                La aplicación ha sido actualizada en el servidor.
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="dismissUpdate()" 
                        style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                        ">
                    Después
                </button>
                <button onclick="updateAppNow()" 
                        style="
                            background: white;
                            border: none;
                            color: #10b981;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 12px;
                        ">
                    Actualizar ahora
                </button>
            </div>
        </div>
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 15 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 15000);
}

// Función para descartar la notificación
function dismissUpdate() {
    const notification = document.getElementById('update-notification');
    if (notification) {
        notification.remove();
    }
}

// Función para actualizar la aplicación inmediatamente
function updateAppNow() {
    const notification = document.getElementById('update-notification');
    if (notification) {
        const button = notification.querySelector('button[onclick="updateAppNow()"]');
        if (button) {
            button.innerHTML = 'Actualizando...';
            button.disabled = true;
        }
    }
    
    // Forzar actualización
    if (window.forceAppUpdate) {
        window.forceAppUpdate();
    } else {
        // Fallback
        window.location.reload(true);
    }
}

// Verificar versión al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar inmediatamente
    setTimeout(checkServerVersion, 1000);
    
    // Verificar cada 3 minutos
    setInterval(checkServerVersion, 3 * 60 * 1000);
    
    // Verificar cuando la página vuelve a estar visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(checkServerVersion, 500);
        }
    });
});

// Hacer las funciones globales
window.checkServerVersion = checkServerVersion;
window.showUpdateNotification = showUpdateNotification;
window.dismissUpdate = dismissUpdate;
window.updateAppNow = updateAppNow;
