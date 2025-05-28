// public/service-worker.js

// 1. Nombre de nuestra caché (¡importante para las actualizaciones!)
// Si cambias algo en los archivos que quieres cachear (URLS_TO_CACHE)
// o en la lógica del service worker, DEBES CAMBIAR ESTE NOMBRE
// para que el navegador actualice la caché. Ejemplo: 'mi-pwa-cache-v2'
const CACHE_NAME = 'mi-pwa-cache-v1';

// 2. Archivos que queremos guardar en caché la primera vez que el Service Worker se instala.
// Estos son los archivos "base" o "esqueleto" de tu aplicación.
// Ya he incluido los que mencionaste.
const URLS_TO_CACHE = [
  '/', // La página principal (index.html)
  '/index.html', // Es bueno tenerlo explícito
  '/manifest.json', // Tu manifest.json
  '/favicon.ico', // Tu favicon
  '/logo192.png', // Tu logo de 192x192
  '/logo512.png', // Tu logo de 512x512
  // --- ¡ATENCIÓN! Archivos de JavaScript y CSS ---
  // Los archivos principales de JS y CSS generados por React (ej: /static/js/main.XXXX.js)
  // cambian de nombre (el XXXX) cada vez que construyes la app.
  // Por ahora, NO los incluiremos aquí para simplificar.
  // El Service Worker los cacheará la PRIMERA VEZ que se pidan gracias al evento 'fetch' de abajo.
  // Si quieres precachearlos (que se guarden durante la instalación), necesitarías
  // una configuración más avanzada, a menudo usando una herramienta como Workbox
  // que genera esta lista automáticamente.
  //
  // EJEMPLOS de otros archivos que PODRÍAS AÑADIR si los tienes y son cruciales
  // y NO cambian de nombre frecuentemente:
  // '/static/media/mi-logo-principal.svg',
  // '/fonts/MiFuenteRegular.woff2',
  // '/offline.html', // Si tuvieras una página offline personalizada
];

// 3. Evento "install": Se dispara cuando el Service Worker se instala por primera vez.
//    Aquí es donde guardamos nuestros archivos base en la caché.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Evento: install');
  // waitUntil() espera a que la promesa que le pasamos se resuelva
  // antes de considerar que la instalación ha terminado.
  event.waitUntil(
    caches.open(CACHE_NAME) // Abrimos (o creamos si no existe) nuestra caché por su nombre
      .then((cache) => {
        console.log('[Service Worker] Caché abierta. Cacheando archivos base:', URLS_TO_CACHE);
        return cache.addAll(URLS_TO_CACHE); // Agregamos todos nuestros archivos base a la caché
      })
      .then(() => {
        console.log('[Service Worker] Archivos base cacheados exitosamente. El Service Worker se instalará.');
        // self.skipWaiting() fuerza al Service Worker en espera a convertirse en el activo.
        // Esto es útil para que los cambios se apliquen más rápido durante el desarrollo.
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Falló el cacheo de archivos base durante la instalación:', error);
      })
  );
});

// 4. Evento "activate": Se dispara después de la instalación (o cuando un nuevo SW reemplaza a uno viejo).
//    Aquí es donde limpiamos cachés antiguas que ya no necesitamos.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Evento: activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => { // Obtenemos los nombres de todas las cachés existentes
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Si el nombre de una caché NO es el actual (CACHE_NAME), la borramos.
          // Esto es crucial para eliminar datos viejos cuando actualizas tu PWA
          // y cambias la versión de CACHE_NAME.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Cachés antiguas limpiadas. Service Worker activado y listo para tomar control.');
      // self.clients.claim() permite a un SW activado tomar control de todos los clientes (pestañas)
      // dentro de su alcance inmediatamente, en lugar de esperar a la próxima navegación.
      return self.clients.claim();
    })
  );
});

// 5. Evento "fetch": Se dispara cada vez que la aplicación web (controlada por este SW)
//    pide un recurso (una página, una imagen, un script, una petición a una API, etc.).
//    Aquí decidimos si servimos el recurso desde la caché o desde la red.
self.addEventListener('fetch', (event) => {
  // Solo nos interesan las peticiones GET. Otras como POST, PUT, etc.,
  // no suelen ser candidatas para cachear de esta forma simple.
  if (event.request.method !== 'GET') {
    // Dejamos que el navegador maneje estas peticiones normalmente.
    return;
  }

  // Estrategia: "Cache, falling back to network" (Caché primero, si falla, ir a la red)
  // Para los archivos de URLS_TO_CACHE, ya deberían estar en caché desde el 'install'.
  // Para otros recursos (ej. peticiones a una API, imágenes nuevas, los JS/CSS que no precacheamos),
  // se intentarán cachear después de pedirlos a la red.
  event.respondWith(
    caches.match(event.request) // Buscamos la petición actual en nuestra caché
      .then((cachedResponse) => {
        // Si la encontramos en caché, la devolvemos. ¡Rápido!
        if (cachedResponse) {
          console.log(`[Service Worker] Sirviendo desde caché: ${event.request.url}`);
          return cachedResponse;
        }

        // Si no está en caché, la pedimos a la red.
        console.log(`[Service Worker] Pidiendo a la red (no en caché): ${event.request.url}`);
        return fetch(event.request).then(
          (networkResponse) => {
            // Una vez que tenemos la respuesta de la red, queremos hacer dos cosas:
            // 1. Devolverla al navegador para que la página la use.
            // 2. Guardar una copia en la caché para futuras peticiones.

            // ¡Importante! Una respuesta (`Response`) solo se puede "consumir" una vez.
            // Como queremos que el navegador la use Y que el service worker la guarde en caché,
            // necesitamos clonarla.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Solo cacheamos respuestas válidas.
                // networkResponse.ok significa status en el rango 200-299.
                // networkResponse.type === 'opaque' son respuestas de terceros sin CORS.
                // Cachearlas puede ser útil para modo offline, pero no puedes leer su contenido.
                // Excluimos explícitamente las extensiones de Chrome, ya que no se pueden cachear y causan errores.
                if ((networkResponse.ok || networkResponse.type === 'opaque') && !event.request.url.startsWith('chrome-extension://')) {
                  console.log(`[Service Worker] Cacheando nueva respuesta de red: ${event.request.url}`);
                  cache.put(event.request, responseToCache);
                }
              });

            return networkResponse; // Devolvemos la respuesta original de la red al navegador.
          }
        ).catch((error) => {
          console.error(`[Service Worker] Fallo al obtener de la red Y no estaba en caché: ${event.request.url}`, error);
          // Aquí es donde podrías devolver una página offline genérica si quisieras.
          // Por ejemplo: return caches.match('/offline.html');
          // Por ahora, simplemente dejamos que el navegador maneje el error de red como lo haría normalmente.
          // Esto significa que el usuario verá el error estándar del navegador si está offline y el recurso no está en caché.
        });
      })
  );
});