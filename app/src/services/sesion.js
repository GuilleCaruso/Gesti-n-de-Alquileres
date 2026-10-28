// Ingreso, salida y perfil del usuario logueado (usuarios/{uid}: nombre, email, rol, activo).
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { ADMIN_INICIAL_UID } from '../firebase-config.js';

// cb recibe: {estado:'fuera'} | {estado:'sinAcceso', user} | {estado:'dentro', user, perfil}
export function escucharSesion(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb({ estado: 'fuera' });
    try {
      const ref = doc(db, 'usuarios', user.uid);
      let snap = await getDoc(ref);
      // primera vez del administrador: crea su propio perfil (permitido solo para su UID en firestore.rules)
      if (!snap.exists() && user.uid === ADMIN_INICIAL_UID) {
        await setDoc(ref, { nombre: user.email.split('@')[0], email: user.email, rol: 'admin', activo: true });
        snap = await getDoc(ref);
      }
      const perfil = snap.exists() ? { uid: user.uid, ...snap.data() } : null;
      if (!perfil || perfil.activo !== true) return cb({ estado: 'sinAcceso', user });
      cb({ estado: 'dentro', user, perfil });
    } catch (e) {
      // sin perfil, las reglas niegan la lectura: es un usuario sin acceso todavía
      cb({ estado: 'sinAcceso', user });
    }
  });
}

export const entrar = (email, clave) => signInWithEmailAndPassword(auth, email.trim(), clave);
export const salir = () => signOut(auth);
export const recuperarClave = (email) => sendPasswordResetEmail(auth, email.trim());
