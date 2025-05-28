import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // 1. IMPORTA ESTO

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Si quieres que tu aplicación funcione offline y cargue más rápido,
// puedes cambiar unregister() por register() abajo.
// Nota: esto viene con algunas consideraciones.
// Aprende más sobre service workers: https://cra.link/PWA
serviceWorkerRegistration.register(); // 2. ASEGÚRATE DE LLAMAR A register()

// Si quieres empezar a medir el rendimiento en tu app, pasa una función
// para registrar resultados (por ejemplo: reportWebVitals(console.log))
// o envía a un endpoint de analíticas. Aprende más: https://bit.ly/CRA-vitals
reportWebVitals();