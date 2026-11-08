// Gestión de usuarios (solo el administrador; lo garantiza firestore.rules).
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';

export async function listarUsuarios() {
  const snap = await getDocs(collection(db, 'usuarios'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
}

// Da acceso a alguien que ya tiene usuario en Authentication (se copia su UID desde la consola o desde su pantalla de "sin acceso").
export const darAcceso = (uid, { nombre, email, rol }) => setDoc(doc(db, 'usuarios', uid.trim()), { nombre, email, rol, activo: true });

export const actualizarUsuario = (uid, cambios) => updateDoc(doc(db, 'usuarios', uid), cambios);
