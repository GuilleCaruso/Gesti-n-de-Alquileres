// Pruebas de las reglas de seguridad (firestore.rules) contra el emulador de Firestore.
// Correr con: npm run test:rules
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-caruso',
    firestore: { rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { nombre: 'Guillermo', rol: 'admin', activo: true });
    await setDoc(doc(db, 'usuarios/emp1'), { nombre: 'Empleado 1', rol: 'empleado', activo: true });
    await setDoc(doc(db, 'usuarios/baja1'), { nombre: 'Ex empleado', rol: 'empleado', activo: false });
    await setDoc(doc(db, 'cuentas/chica'), { nombre: 'Caja chica', efectivo: true, soloAdmin: false });
    await setDoc(doc(db, 'cuentas/grande'), { nombre: 'Caja grande', efectivo: true, soloAdmin: true });
    await setDoc(doc(db, 'cuentas/icbc'), { nombre: 'ICBC', efectivo: false, soloAdmin: false });
    await setDoc(doc(db, 'movimientos/m-grande'), { cuentaId: 'grande', tipo: 'ingreso', monto: 1000, soloAdmin: true, creadoPor: 'admin1' });
    await setDoc(doc(db, 'movimientos/m-icbc'), { cuentaId: 'icbc', tipo: 'ingreso', monto: 500, soloAdmin: false, creadoPor: 'emp1' });
    await setDoc(doc(db, 'contratos/c1'), { numero: '0154' });
  });
});

const como = (uid) => env.authenticatedContext(uid).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const mov = (uid, cuentaId, tipo, soloAdmin) => ({ cuentaId, tipo, monto: 100, soloAdmin, creadoPor: uid });

describe('acceso general', () => {
  test('sin iniciar sesión no se lee nada', async () => {
    await assertFails(getDoc(doc(anonimo(), 'contratos/c1')));
  });
  test('un empleado activo lee y carga personas', async () => {
    await assertSucceeds(setDoc(doc(como('emp1'), 'personas/p1'), { nombre: 'Juan' }));
    await assertSucceeds(getDoc(doc(como('emp1'), 'personas/p1')));
  });
  test('un usuario dado de baja no lee nada', async () => {
    await assertFails(getDoc(doc(como('baja1'), 'contratos/c1')));
  });
  test('alguien logueado pero sin perfil en usuarios no lee nada', async () => {
    await assertFails(getDoc(doc(como('desconocido'), 'contratos/c1')));
  });
  test('nadie borra contratos, ni siquiera el administrador', async () => {
    await assertFails(deleteDoc(doc(como('admin1'), 'contratos/c1')));
  });
});

describe('usuarios y roles', () => {
  test('un empleado no puede ascenderse a administrador', async () => {
    await assertFails(updateDoc(doc(como('emp1'), 'usuarios/emp1'), { rol: 'admin' }));
  });
  test('un empleado no ve los datos de otros usuarios', async () => {
    await assertFails(getDoc(doc(como('emp1'), 'usuarios/admin1')));
  });
  test('la primera vez, el administrador inicial crea su propio perfil', async () => {
    await assertSucceeds(setDoc(doc(como('PENDIENTE_UID_ADMIN'), 'usuarios/PENDIENTE_UID_ADMIN'), { nombre: 'Guillermo', rol: 'admin', activo: true }));
  });
  test('cualquier otro usuario nuevo NO puede darse acceso solo', async () => {
    await assertFails(setDoc(doc(como('nuevo1'), 'usuarios/nuevo1'), { nombre: 'Intruso', rol: 'admin', activo: true }));
    await assertFails(setDoc(doc(como('nuevo1'), 'usuarios/nuevo1'), { nombre: 'Intruso', rol: 'empleado', activo: true }));
  });
  test('el administrador lista todos los usuarios', async () => {
    await assertSucceeds(getDocs(collection(como('admin1'), 'usuarios')));
  });
  test('el administrador da acceso a un usuario nuevo', async () => {
    await assertSucceeds(setDoc(doc(como('admin1'), 'usuarios/nuevo2'), { nombre: 'Laura', email: 'l@x.com', rol: 'empleado', activo: true }));
  });
  test('el administrador cambia roles y da de baja', async () => {
    await assertSucceeds(updateDoc(doc(como('admin1'), 'usuarios/emp1'), { activo: false }));
  });
});

describe('caja y bancos', () => {
  test('el empleado ve la caja chica y los bancos', async () => {
    await assertSucceeds(getDoc(doc(como('emp1'), 'cuentas/chica')));
    await assertSucceeds(getDoc(doc(como('emp1'), 'cuentas/icbc')));
  });
  test('el empleado NO ve la caja grande', async () => {
    await assertFails(getDoc(doc(como('emp1'), 'cuentas/grande')));
  });
  test('el empleado NO ve movimientos de la caja grande, ni pidiendo el documento directo', async () => {
    await assertFails(getDoc(doc(como('emp1'), 'movimientos/m-grande')));
  });
  test('el empleado lista movimientos solo filtrando los que puede ver', async () => {
    const db = como('emp1');
    await assertSucceeds(getDocs(query(collection(db, 'movimientos'), where('soloAdmin', '==', false))));
    await assertFails(getDocs(collection(db, 'movimientos')));
  });
  test('el empleado cobra en efectivo (ingreso a caja chica)', async () => {
    await assertSucceeds(setDoc(doc(como('emp1'), 'movimientos/n1'), mov('emp1', 'chica', 'ingreso', false)));
  });
  test('el empleado NO paga en efectivo (egreso de caja chica)', async () => {
    await assertFails(setDoc(doc(como('emp1'), 'movimientos/n2'), mov('emp1', 'chica', 'egreso', false)));
  });
  test('el empleado paga por transferencia (egreso de ICBC)', async () => {
    await assertSucceeds(setDoc(doc(como('emp1'), 'movimientos/n3'), mov('emp1', 'icbc', 'egreso', false)));
  });
  test('el empleado NO registra nada en la caja grande', async () => {
    await assertFails(setDoc(doc(como('emp1'), 'movimientos/n4'), mov('emp1', 'grande', 'ingreso', true)));
  });
  test('no se puede disfrazar un movimiento de caja grande como visible', async () => {
    await assertFails(setDoc(doc(como('admin1'), 'movimientos/n5'), mov('admin1', 'grande', 'ingreso', false)));
  });
  test('nadie carga un movimiento a nombre de otro', async () => {
    await assertFails(setDoc(doc(como('emp1'), 'movimientos/n6'), mov('admin1', 'icbc', 'ingreso', false)));
  });
  test('el administrador paga desde la caja grande', async () => {
    await assertSucceeds(setDoc(doc(como('admin1'), 'movimientos/n7'), mov('admin1', 'grande', 'egreso', true)));
  });
  test('los movimientos no se borran: se anulan', async () => {
    await assertFails(deleteDoc(doc(como('admin1'), 'movimientos/m-icbc')));
    await assertSucceeds(updateDoc(doc(como('emp1'), 'movimientos/m-icbc'), { anulado: true }));
  });
  test('el empleado no puede mover un movimiento a la caja grande', async () => {
    await assertFails(updateDoc(doc(como('emp1'), 'movimientos/m-icbc'), { cuentaId: 'grande', soloAdmin: true }));
  });
});
