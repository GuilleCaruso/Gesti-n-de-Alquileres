// Datos de conexión de las apps web de Firebase (Configuración del proyecto → Tus apps).
// Son públicos por diseño: la seguridad la dan las reglas de firestore.rules.
// Hay dos proyectos: el real (caruso-propiedades) y el de pruebas (caruso-pruebas), con datos de mentira.
// Los links de vista previa se compilan con VITE_ENTORNO=pruebas; la app definitiva, sin esa variable.
const ENTORNOS = {
  produccion: {
    firebaseConfig: {
      apiKey: 'AIzaSyBNR-_qlukTl__Kpsgls7g2gXdKUyQUWxo',
      authDomain: 'caruso-propiedades.firebaseapp.com',
      projectId: 'caruso-propiedades',
      storageBucket: 'caruso-propiedades.firebasestorage.app',
      messagingSenderId: '855036047332',
      appId: '1:855036047332:web:35e7c7a9025f74ee8da1f1',
    },
    // UID de Guillermo en ese proyecto (Authentication → Users). Debe coincidir con adminInicial() en firestore.rules.
    adminInicial: 'XbYkLAgjmKQQJB6kOuUnzTqxdnP2',
  },
  pruebas: {
    firebaseConfig: {
      apiKey: 'AIzaSyCww_TQAInOKJPa0JGpt9c8RDv0SoG8FWw',
      authDomain: 'caruso-pruebas.firebaseapp.com',
      projectId: 'caruso-pruebas',
      storageBucket: 'caruso-pruebas.firebasestorage.app',
      messagingSenderId: '1033320162520',
      appId: '1:1033320162520:web:b44825f54bc5be87f0e3ad',
    },
    adminInicial: 'Gu6P2gWnzSNIHBT1GMiMxa1x8zX2',
  },
};

export const ENTORNO = import.meta.env?.VITE_ENTORNO === 'pruebas' ? 'pruebas' : 'produccion';
export const esPruebas = ENTORNO === 'pruebas';
export const firebaseConfig = ENTORNOS[ENTORNO].firebaseConfig;
export const ADMIN_INICIAL_UID = ENTORNOS[ENTORNO].adminInicial;
