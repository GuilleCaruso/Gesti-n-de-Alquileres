// Conexión con Firebase. Con VITE_EMULADOR=1 usa los emuladores locales (pruebas, sin tocar datos reales).
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';

const usarEmulador = import.meta.env.VITE_EMULADOR === '1';

export const configurado = usarEmulador || !!firebaseConfig.apiKey;

let auth = null;
let db = null;
if (configurado) {
  const app = initializeApp(usarEmulador ? { apiKey: 'demo', projectId: 'demo-caruso', authDomain: 'localhost' } : firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (usarEmulador) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export { auth, db };
