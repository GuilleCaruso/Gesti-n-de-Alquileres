// Datos de conexión de la app web de Firebase (Configuración del proyecto → Tus apps → caruso-web).
// Son públicos por diseño: la seguridad la dan las reglas de firestore.rules.
// PENDIENTE: completar con el bloque firebaseConfig que copia Guillermo (instructivo, Paso 1-D).
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// UID de Guillermo (Authentication → Users). Debe coincidir con adminInicial() en firestore.rules.
export const ADMIN_INICIAL_UID = 'PENDIENTE_UID_ADMIN';
