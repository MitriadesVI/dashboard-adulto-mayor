// public/service-worker.js

// 🚀 VERSIÓN AUTOMÁTICA: Se actualiza cada vez que haces build
// En desarrollo, cambia cada vez que modificas el archivo
// En producción, puedes usar process.env o fecha de build
const CACHE_VERSION = 'sepam-cache-' + new Date().getTime();

// Archivos críticos que SIEMPRE deben estar disponibles offline
const CRITICAL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// 🔧 CONFIGURACIÓN: Qué cachear y qué no
const CACHE_STRATEGIES = {
  // Archivos críticos: Cache First (rápido, siempre disponible)
  critical: /\/(index\.html|manifest\.json|favicon\.ico|logo.*\.png)$/,
  
  // APIs Firebase: Network First (datos frescos, fallback a cache)
  api: /firestore\.googleapis\.com|firebase/,
  
  // Assets estáticos: Cache First con validación
  static: /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/,
  
  // No cachear: Auth tokens, analytics
  exclude: /\/(auth|analytics|tracking)/
};

// 📦 INSTALACIÓN: Cachear archivos críticos
self.addEventListener('install', (event) => {
  console.log('[SW] 🚀 Instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        console.log('[SW] 📦 Cacheando archivos críticos...');
        return cache.addAll(CRITICAL_URLS);
      })
      .then(() => {
        console.log('[SW] ✅ Archivos críticos cacheados');
        return self.skipWaiting(); // Activa inmediatamente
      })
      .catch(error => {
        console.error('[SW] ❌ Error cacheando archivos críticos:', error);
      })
  );
});

// 🧹 ACTIVACIÓN: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    // Obtener todas las claves de cache existentes
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Si no es la versión actual, eliminar
            if (cacheName !== CACHE_VERSION && cacheName.startsWith('sepam-cache-')) {
              console.log('[SW] 🗑️ Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Caches antiguas limpiadas');
        return self.clients.claim(); // Toma control de todas las pestañas
      })
  );
});

// 🌐 INTERCEPCIÓN: Estrategias inteligentes de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Solo GET requests
  if (request.method !== 'GET') return;
  
  // Excluir URLs específicas
  if (CACHE_STRATEGIES.exclude.test(url)) return;
  
  event.respondWith(handleRequest(request, url));
});

// 🎯 FUNCIÓN PRINCIPAL: Manejar diferentes tipos de requests
async function handleRequest(request, url) {
  try {
    // 1. ARCHIVOS CRÍTICOS: Cache First
    if (CACHE_STRATEGIES.critical.test(url)) {
      return await cacheFirst(request);
    }
    
    // 2. APIs: Network First (datos frescos)
    if (CACHE_STRATEGIES.api.test(url)) {
      return await networkFirst(request);
    }
    
    // 3. ASSETS ESTÁTICOS: Cache First con revalidación
    if (CACHE_STRATEGIES.static.test(url)) {
      return await cacheFirst(request, true);
    }
    
    // 4. TODO LO DEMÁS: Network First
    return await networkFirst(request);
    
  } catch (error) {
    console.error('[SW] ❌ Error manejando request:', url, error);
    
    // Fallback para páginas HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(CACHE_VERSION);
      return await cache.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// 📱 ESTRATEGIA: Cache First
async function cacheFirst(request, revalidate = false) {
  const cache = await caches.open(CACHE_VERSION);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] 📱 Cache hit:', request.url);
    
    // Revalidar en background si se solicita
    if (revalidate) {
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {}); // Ignore network errors
    }
    
    return cachedResponse;
  }
  
  // No está en cache, ir a la red
  console.log('[SW] 🌐 Cache miss, fetching:', request.url);
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// 🌐 ESTRATEGIA: Network First
async function networkFirst(request) {
  try {
    console.log('[SW] 🌐 Network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network falló, intentar cache
    console.log('[SW] 📱 Network failed, trying cache:', request.url);
    const cache = await caches.open(CACHE_VERSION);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}