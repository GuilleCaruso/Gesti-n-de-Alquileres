// Prueba de punta a punta de la etapa 1 contra los emuladores (auth + firestore).
// Correr con: npm run test:e2e
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const URL = 'http://127.0.0.1:5179/';
const ok = (n, c) => { console.log((c ? 'OK    ' : 'FALLA ') + n); if (!c) process.exitCode = 1; };

async function crearUsuario(email, password, localId) {
  const r = localId
    ? await fetch(`${AUTH}/projects/demo-caruso/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId, email, password }) })
    : await fetch(`${AUTH}/accounts:signUp?key=demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const j = await r.json();
  if (!j.localId) throw new Error('No se pudo crear ' + email + ': ' + JSON.stringify(j));
  return j.localId;
}

const vite = spawn('npx', ['vite', '--port', '5179', '--strictPort', '--host', '127.0.0.1'], { env: { ...process.env, VITE_EMULADOR: '1' }, stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(URL); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  await crearUsuario('guillermo@test.com', 'clave-admin-1', 'PENDIENTE_UID_ADMIN');
  const uidEmp = await crearUsuario('laura@test.com', 'clave-emp-1');

  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errores = [];
  const nueva = async () => { const ctx = await b.newContext(); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message)); await pg.goto(URL); return pg; };
  const login = async (pg, email, clave) => { await pg.fill('#loginEmail', email); await pg.fill('#loginClave', clave); await pg.click('#loginBtn'); };

  // contraseña incorrecta
  let pg = await nueva();
  await login(pg, 'guillermo@test.com', 'mal');
  await pg.waitForSelector('#loginError:has-text("incorrectos")');
  ok('contraseña incorrecta muestra error', true);

  // administrador: primera vez → se crea su perfil
  await login(pg, 'guillermo@test.com', 'clave-admin-1');
  await pg.waitForSelector('.page-title:has-text("Hola")');
  ok('el administrador entra la primera vez sin tocar la base a mano', true);
  ok('el administrador ve "Usuarios" en el menú', await pg.locator('[data-nav="usuarios"]').count() === 1);
  await pg.screenshot({ path: process.env.SHOTS + '/inicio-admin.png' });
  const admin = pg;

  // empleado sin acceso → ve su UID
  const emp = await nueva();
  await login(emp, 'laura@test.com', 'clave-emp-1');
  await emp.waitForSelector('text=Todavía no tenés acceso');
  ok('empleado sin acceso ve la pantalla con su UID', (await emp.inputValue('input[readonly]')) === uidEmp);

  // el administrador le da acceso
  await admin.click('[data-nav="usuarios"]');
  await admin.waitForSelector('#nuUid');
  await admin.fill('#nuUid', uidEmp); await admin.fill('#nuNombre', 'Laura'); await admin.fill('#nuEmail', 'laura@test.com');
  await admin.click('#nuGuardar');
  await admin.waitForSelector('td:has-text("Laura")');
  ok('el administrador da acceso desde Usuarios', true);
  await admin.screenshot({ path: process.env.SHOTS + '/usuarios.png' });

  await emp.reload(); await emp.waitForSelector('.page-title:has-text("Hola, Laura")');
  ok('el empleado entra después de recibir acceso', true);
  ok('el empleado NO ve "Usuarios" en el menú', await emp.locator('[data-nav="usuarios"]').count() === 0);
  await emp.goto(URL + '#/usuarios'); await emp.waitForTimeout(400);
  ok('el empleado entrando por link a #/usuarios vuelve a Inicio', await emp.locator('.page-title:has-text("Hola")').count() === 1);
  await emp.click('[data-nav="caja"]');
  await emp.waitForSelector('text=Se habilita en la etapa 8');
  ok('módulos futuros muestran en qué etapa se habilitan', true);
  await emp.screenshot({ path: process.env.SHOTS + '/empleado-caja.png' });

  // quitar acceso
  await admin.click('[data-acceso], [data-activo]');
  await admin.waitForSelector('text=Sin acceso');
  await emp.reload(); await emp.waitForSelector('text=Todavía no tenés acceso');
  ok('al quitarle el acceso, el empleado queda afuera', true);

  // salir
  await admin.click('#salirBtn'); await admin.waitForSelector('#loginEmail');
  ok('botón Salir', true);
  ok('sin errores en la página: ' + JSON.stringify(errores), errores.length === 0);
  await b.close();
} finally {
  vite.kill();
}
