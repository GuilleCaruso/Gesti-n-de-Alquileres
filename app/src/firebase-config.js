// Datos de conexión de la app web de Firebase (Configuración del proyecto → Tus apps → caruso-web).
// Son públicos por diseño: la seguridad la dan las reglas de firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyBNR-_qlukTl__Kpsgls7g2gXdKUyQUWxo',
  authDomain: 'caruso-propiedades.firebaseapp.com',
  projectId: 'caruso-propiedades',
  storageBucket: 'caruso-propiedades.firebasestorage.app',
  messagingSenderId: '855036047332',
  appId: '1:855036047332:web:35e7c7a9025f74ee8da1f1',
};

// UID de Guillermo (Authentication → Users). Debe coincidir con adminInicial() en firestore.rules.
export const ADMIN_INICIAL_UID = 'XbYkLAgjmKQQJB6kOuUnzTqxdnP2';
