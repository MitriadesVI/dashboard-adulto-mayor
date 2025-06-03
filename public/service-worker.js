// public/service-worker.js - VERSIÓN CORREGIDA

// Versión automática 
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

// 🚨 CONFIGURACIÓN CRUCIAL: URLs que NO deben cachearse NUNCA
const NEVER_CACHE_PATTERNS = [
  // Firebase Auth y APIs
  /identitytoolkit\.googleapis\.com/,
  /firebase/,
  /firestore\.googleapis\.com/,
  /googleapis\.com.*auth/,
  
  // Auth específicos
  /\/auth\//,
  /signInWithEmailAndPassword/,
  /accounts:signInWithPassword/,
  
  // Otros que no deben cachearse
  /chrome-extension/,
  /analytics/,
  /gtag/
];

// 🔧 FUNCIÓN: Verificar si una URL NO debe cachearse
function shouldNeverCache(url) {
  return NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// 📦 INSTALACIÓN
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
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] ❌ Error cacheando archivos críticos:', error);
      })
  );
});

// 🧹 ACTIVACIÓN
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_VERSION && cacheName.startsWith('sepam-cache-')) {
              console.log('[SW] 🗑️ Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Caches antiguas limpiadas');
        return self.clients.claim();
      })
  );
});

// 🌐 INTERCEPCIÓN DE REQUESTS - CON EXCLUSIONES FIREBASE
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Solo GET requests
  if (request.method !== 'GET') {
    console.log('[SW] ⏭️ Ignorando request no-GET:', request.method, url);
    return;
  }
  
  // 🚨 NUNCA cachear Firebase Auth y APIs críticas
  if (shouldNeverCache(url)) {
    console.log('[SW] 🚫 NO cacheando (Firebase/Auth):', url);
    return; // Dejar que el navegador maneje directamente
  }
  
  event.respondWith(handleRequest(request, url));
});

// 🎯 MANEJAR REQUESTS CON ESTRATEGIAS INTELIGENTES
async function handleRequest(request, url) {
  try {
    // 1. ARCHIVOS CRÍTICOS: Cache First
    if (CRITICAL_URLS.some(criticalUrl => url.endsWith(criticalUrl))) {
      return await cacheFirst(request);
    }
    
    // 2. ASSETS ESTÁTICOS: Cache First con revalidación
    if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$/.test(url)) {
      return await cacheFirst(request, true);
    }
    
    // 3. TODO LO DEMÁS: Network First (incluye APIs no-Firebase)
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
        if (response.ok && !shouldNeverCache(request.url)) {
          cache.put(request, response.clone());
        }
      }).catch(() => {}); // Ignore network errors
    }
    
    return cachedResponse;
  }
  
  // No está en cache, ir a la red
  console.log('[SW] 🌐 Cache miss, fetching:', request.url);
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok && !shouldNeverCache(request.url)) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// 🌐 ESTRATEGIA: Network First  
async function networkFirst(request) {
  try {
    console.log('[SW] 🌐 Network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && !shouldNeverCache(request.url)) {
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

// 📨 MANEJAR MENSAJES PARA ACTUALIZACIONES
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] ⏭️ Activando nueva versión inmediatamente');
    self.skipWaiting();
  }
});