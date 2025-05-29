// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🚀 IMPORTAR LA FUNCIÓN DE REGISTRO DEL SERVICE WORKER
import { register as registerSW } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 🚀 REGISTRAR EL SERVICE WORKER
registerSW({
  onSuccess: () => {
    console.log('PWA: Contenido cacheado para uso offline');
    // Opcional: Mostrar un toast/notificación al usuario
  },
  onUpdate: (registration) => {
    console.log('PWA: Nuevo contenido disponible, recarga para actualizar');
    // Opcional: Mostrar botón de "Actualizar app" al usuario
  }
});

reportWebVitals();