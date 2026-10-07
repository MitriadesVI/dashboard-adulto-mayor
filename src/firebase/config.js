import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase (la apiKey web es pública por diseño; la seguridad
// depende de las reglas de Firestore en firestore.rules)
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

// Desarrollo/pruebas: REACT_APP_USE_EMULATORS=true usa los emuladores locales de Firebase
// (firebase emulators:start --only auth,firestore) en lugar del proyecto real.
const USE_EMULATORS = process.env.REACT_APP_USE_EMULATORS === 'true';
if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Instancia secundaria solo para crear cuentas de otros usuarios.
// createUserWithEmailAndPassword inicia sesión con la cuenta creada; hacerlo en una
// app aparte evita que el administrador pierda (o cambie) su propia sesión.
const SECONDARY_APP_NAME = 'user-provisioning';

const getSecondaryAuth = async () => {
  const secondaryApp = getApps().some(a => a.name === SECONDARY_APP_NAME)
    ? getApp(SECONDARY_APP_NAME)
    : initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);
  if (USE_EMULATORS && !secondaryAuth.emulatorConfig) {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  await setPersistence(secondaryAuth, inMemoryPersistence);
  return secondaryAuth;
};

export { auth, db, storage, getSecondaryAuth };
