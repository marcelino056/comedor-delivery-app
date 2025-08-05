// Registro y gestión del Service Worker con auto-actualización
(function() {
    'use strict';
    
    let swRegistration = null;
    let refreshing = false;
    
    // Verificar si el navegador soporta service workers
    if ('serviceWorker' in navigator) {
        console.log('Service Worker: Soporte detectado');
        
        // Registrar service worker cuando la página cargue
        window.addEventListener('load', () => {
            registerServiceWorker();
        });
        
        // Escuchar cambios de visibilidad para verificar actualizaciones
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && swRegistration) {
                checkForUpdates();
            }
        });
        
        // Verificar actualizaciones cada 5 minutos
        setInterval(() => {
            if (swRegistration) {
                checkForUpdates();
            }
        }, 5 * 60 * 1000);
    }
    
    function registerServiceWorker() {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker: Registrado exitosamente', registration.scope);
                swRegistration = registration;
                
                // Verificar si hay una actualización disponible inmediatamente
                if (registration.waiting) {
                    showUpdateAvailable();
                }
                
                // Escuchar nuevas instalaciones
                registration.addEventListener('updatefound', () => {
                    console.log('Service Worker: Nueva versión encontrada');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // Nueva versión disponible
                                showUpdateAvailable();
                            } else {
                                // Primera instalación
                                console.log('Service Worker: Primera instalación completada');
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('Service Worker: Error en registro', error);
            });
        
        // Escuchar cuando el service worker toma control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            console.log('Service Worker: Nueva versión activada, recargando...');
            window.location.reload();
        });
    }
    
    function checkForUpdates() {
        if (swRegistration) {
            console.log('Service Worker: Verificando actualizaciones...');
            swRegistration.update();
        }
    }
    
    function showUpdateAvailable() {
        console.log('Service Worker: Actualización disponible');
        
        // Mostrar notificación de actualización
        if (window.showUpdateNotification) {
            window.showUpdateNotification(() => {
                forceUpdate();
            });
        } else {
            // Fallback: preguntar directamente
            if (confirm('¡Nueva versión disponible! ¿Deseas actualizar ahora?')) {
                forceUpdate();
            }
        }
    }
    
    function forceUpdate() {
        if (swRegistration && swRegistration.waiting) {
            console.log('Service Worker: Forzando actualización');
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
    
    // Función global para forzar actualización desde el exterior
    window.forceAppUpdate = function() {
        console.log('Service Worker: Actualización forzada por usuario');
        
        // Limpiar caché del navegador
        if ('caches' in window) {
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName.startsWith('comedor-delivery-v')) {
                            console.log('Limpiando caché:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }).then(() => {
                // Enviar mensaje al service worker para limpiar su caché
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                }
                
                // Recargar página
                setTimeout(() => {
                    window.location.reload(true);
                }, 500);
            });
        } else {
            // Si no hay soporte para caché, solo recargar
            window.location.reload(true);
        }
    };
    
    // Función global para mostrar notificación de actualización
    window.showUpdateNotification = function(callback) {
        // Crear notificación personalizada
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #3b82f6;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="font-weight: bold; margin-bottom: 8px;">
                    🔄 Nueva versión disponible
                </div>
                <div style="font-size: 14px; margin-bottom: 12px;">
                    Hay una actualización disponible para la aplicación.
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
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
                    <button onclick="updateApp(this)" 
                            style="
                                background: white;
                                border: none;
                                color: #3b82f6;
                                padding: 6px 12px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 12px;
                            ">
                        Actualizar
                    </button>
                </div>
            </div>
        `;
        
        // Función para actualizar
        window.updateApp = function(button) {
            button.innerHTML = 'Actualizando...';
            button.disabled = true;
            callback();
        };
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    };
    
})();
