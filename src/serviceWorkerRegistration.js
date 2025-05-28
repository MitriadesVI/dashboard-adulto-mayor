// Este script opcional se usa para registrar un service worker.
// register() no se llama por defecto.

// Esto permite que la aplicación cargue más rápido en visitas posteriores en producción y
// le da capacidades offline. Sin embargo, también significa que los desarrolladores (y usuarios)
// solo verán las actualizaciones desplegadas en visitas posteriores a una página, después de que
// todas las pestañas existentes abiertas en la página se hayan cerrado, ya que los recursos
// previamente cacheados se actualizan en segundo plano.

// Para aprender más sobre los beneficios de este modelo y las instrucciones sobre cómo
// optar por él, lee https://cra.link/PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] es la dirección IPv6 de localhost.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 son considerados localhost para IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // El constructor de URL está disponible en todos los navegadores que soportan SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Nuestro service worker no funcionará si PUBLIC_URL está en un origen diferente
      // del que nuestra página se sirve. Esto podría suceder si un CDN se usa para
      // servir assets; mira https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // Esto se está ejecutando en localhost. Verifiquemos si un service worker todavía existe o no.
        checkValidServiceWorker(swUrl, config);

        // Añadir algún logging adicional a localhost, apuntando a los desarrolladores a la
        // documentación del service worker/PWA.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
              'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        // No es localhost. Solo registrar el service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // En este punto, el contenido precacheado actualizado ha sido obtenido,
              // pero el service worker anterior seguirá sirviendo el contenido más antiguo
              // hasta que todas las pestañas del cliente estén cerradas.
              console.log(
                'New content is available and will be used when all ' +
                  'tabs for this page are closed. See https://cra.link/PWA.'
              );

              // Ejecutar callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // En este punto, todo ha sido precacheado.
              // Es el momento perfecto para mostrar un mensaje de
              // "Content is cached for offline use."
              console.log('Content is cached for offline use.');

              // Ejecutar callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Verificar si el service worker puede ser encontrado. Si no puede recargar la página.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Asegurarse de que el service worker exista, y que realmente estamos obteniendo un archivo JS.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No se encontró service worker. Probablemente una aplicación diferente. Recargar la página.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker encontrado. Proceder normalmente.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}