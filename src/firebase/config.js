import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase actualizada
const firebaseConfig = {
  apiKey: "AIzaSyAvo8U-d9C5n21wgsUllHPUfMOjr0idkjg",
  authDomain: "cdv1-74cb3.firebaseapp.com",
  projectId: "cdv1-74cb3",
  storageBucket: "cdv1-74cb3.firebasestorage.app",
  messagingSenderId: "414484780811",
  appId: "1:414484780811:web:2118255be7dd06dfc3340e"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de los servicios
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };