// Datos de conexión de la app web de Firebase (Configuración del proyecto → Tus apps → caruso-web).
// Son públicos por diseño: la seguridad la dan las reglas de firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyAhAesTHe8q-wpVy2FGXPp8Lw5DJxi8jtg',
  authDomain: 'mi-app-inmobiliaria-3d461.firebaseapp.com',
  projectId: 'mi-app-inmobiliaria-3d461',
  storageBucket: 'mi-app-inmobiliaria-3d461.firebasestorage.app',
  messagingSenderId: '401339260242',
  appId: '1:401339260242:web:a8a46faba6daef6433ee8b',
};

// UID de Guillermo (Authentication → Users). Debe coincidir con adminInicial() en firestore.rules.
export const ADMIN_INICIAL_UID = 'PENDIENTE_UID_ADMIN';
