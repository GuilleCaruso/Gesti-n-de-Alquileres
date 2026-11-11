// Datos de la operación diaria, cargados en tiempo real desde Firestore.
// Las pantallas leen de `datos()`; cuando algo cambia en la base (lo cargue quien lo cargue), se avisa a `alCambiar`.
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase.js';

const estado = { personas: [], propiedades: [], contratos: [], pagos: [], indices: { ICL: 0, IPC: 0 }, listo: false };
const oyentes = new Set();
let bajas = [];
let usuario = null;

export const datos = () => estado;
export const alCambiar = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
const avisar = () => oyentes.forEach((fn) => fn());

// `periodoDesde`: se cargan los cobros desde ese mes (un año para atrás alcanza para el día a día).
export function iniciarDatos(perfil, periodoDesde) {
  detenerDatos();
  usuario = perfil;
  const cargadas = new Set();
  const suscribir = (nombre, q) => onSnapshot(q, (snap) => {
    estado[nombre] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cargadas.add(nombre);
    estado.listo = cargadas.size >= 4;
    avisar();
  }, (err) => console.error('Error al leer ' + nombre, err));
  bajas = [
    suscribir('personas', collection(db, 'personas')),
    suscribir('propiedades', collection(db, 'propiedades')),
    suscribir('contratos', collection(db, 'contratos')),
    suscribir('pagos', query(collection(db, 'pagos'), where('periodo', '>=', periodoDesde))),
    onSnapshot(doc(db, 'config', 'indices'), (s) => { estado.indices = s.exists() ? s.data() : { ICL: 0, IPC: 0 }; avisar(); }),
  ];
}

export function detenerDatos() {
  bajas.forEach((baja) => baja());
  bajas = [];
  Object.assign(estado, { personas: [], propiedades: [], contratos: [], pagos: [], listo: false });
}

const firma = () => ({ actualizadoPor: usuario?.uid || null, actualizadoEn: serverTimestamp() });

// Crea (sin id) o reemplaza campos (con id) de un documento. Devuelve el id.
export async function guardar(coleccion, id, data) {
  const ref = id ? doc(db, coleccion, id) : doc(collection(db, coleccion));
  const extra = id ? firma() : { ...firma(), creadoPor: usuario?.uid || null, creadoEn: serverTimestamp() };
  await setDoc(ref, { ...data, ...extra }, { merge: true });
  return ref.id;
}

export const actualizar = (coleccion, id, cambios) => updateDoc(doc(db, coleccion, id), { ...cambios, ...firma() });

// Todo lo que hay en la base, para la copia de seguridad (incluye los cobros de todos los años).
export async function leerTodo() {
  const leer = async (col) => (await getDocs(collection(db, col))).docs.map((x) => ({ id: x.id, ...x.data() }));
  const [personas, propiedades, contratos, pagos, config] = await Promise.all(['personas', 'propiedades', 'contratos', 'pagos', 'config'].map(leer));
  return { personas, propiedades, contratos, pagos, config };
}

// Borrado físico: solo el administrador, y solo lo que no tiene historia (lo controla cada pantalla).
export const borrar = (coleccion, id) => deleteDoc(doc(db, coleccion, id));

// ¿El contrato tiene algún cobro registrado? Busca en toda la base, no solo en el último año cargado.
export async function tieneCobros(contratoId) {
  const r = await getDocs(query(collection(db, 'pagos'), where('contractId', '==', contratoId)));
  return r.docs.some((x) => (x.data().pagado || 0) > 0 || (x.data().cobros || []).length > 0);
}

export const guardarIndices = (ICL, IPC) => setDoc(doc(db, 'config', 'indices'), { ICL, IPC, ...firma() });

// Id nuevo sin escribir todavía (para armar lotes que se referencian entre sí).
export const nuevoId = (coleccion) => doc(collection(db, coleccion)).id;

// Cambios en lote sobre documentos existentes: [{coleccion, id, cambios}], de a 400 por tanda.
export async function actualizarLote(items) {
  for (let i = 0; i < items.length; i += 400) {
    const lote = writeBatch(db);
    items.slice(i, i + 400).forEach(({ coleccion, id, cambios }) => lote.update(doc(db, coleccion, id), { ...cambios, ...firma() }));
    await lote.commit();
  }
}

// Escritura en lote (importación): [{coleccion, id, data}], de a 400 por tanda.
export async function guardarLote(items) {
  for (let i = 0; i < items.length; i += 400) {
    const lote = writeBatch(db);
    items.slice(i, i + 400).forEach(({ coleccion, id, data }) =>
      lote.set(doc(db, coleccion, id), { ...data, ...firma(), creadoPor: usuario?.uid || null, creadoEn: serverTimestamp(), importado: true }));
    await lote.commit();
  }
}
