// Generar versión basada en timestamp para invalidar caché automáticamente
const CACHE_VERSION = 1754420251;
const CACHE_NAME = `comedor-delivery-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/modules/api.js',
  '/modules/clientes.js',
  '/modules/configuracion.js',
  '/modules/creditos.js',
  '/modules/facturas.js',
  '/modules/gastos.js',
  '/modules/modales.js',
  '/modules/ordenes.js',
  '/modules/state.js',
  '/modules/ui.js',
  '/modules/ventas.js',
  '/modules/websocket.js'
];

// Instalar service worker y saltar espera
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando nueva versión', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache abierto', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forzar activación inmediata
        return self.skipWaiting();
      })
  );
});

// Interceptar peticiones con estrategia network-first para archivos críticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Para archivos críticos usar network-first
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Si la red funciona, actualizar caché y devolver respuesta
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si la red falla, usar caché como fallback
          return caches.match(event.request);
        })
    );
  } else {
    // Para otros archivos usar cache-first
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});

// Actualizar service worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando nueva versión', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('comedor-delivery-v')) {
            console.log('Service Worker: Eliminando caché antigua', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control de todas las pestañas inmediatamente
      return self.clients.claim();
    })
  );
});

// Escuchar mensajes para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Forzando actualización');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Service Worker: Limpiando caché');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('comedor-delivery-v')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});
