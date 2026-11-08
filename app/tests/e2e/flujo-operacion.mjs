// Prueba de punta a punta del reemplazo de Arcomercial: importar, cargar a mano, aumentos y recibos.
// Corre contra los emuladores (auth + firestore): npm run test:e2e
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const BASE = 'http://127.0.0.1:5180/';
const CSV = fileURLToPath(new URL('./datos/arcomercial-ejemplo.csv', import.meta.url));
const XLSX = fileURLToPath(new URL('./datos/arcomercial-ejemplo.xlsx', import.meta.url));
const SHOTS = process.env.SHOTS || '/tmp';
const ok = (n, c) => { console.log((c ? 'OK    ' : 'FALLA ') + n); if (!c) process.exitCode = 1; };

async function crearUsuario(email, password, localId) {
  const r = await fetch(`${AUTH}/projects/demo-caruso/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId, email, password }) });
  const j = await r.json();
  if (!j.localId) throw new Error('No se pudo crear ' + email + ': ' + JSON.stringify(j));
}

const vite = spawn('npx', ['vite', '--port', '5180', '--strictPort', '--host', '127.0.0.1'], { env: { ...process.env, VITE_EMULADOR: '1' }, stdio: 'ignore' });
try {
  // cada prueba arranca con la base de prueba vacía
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-caruso/accounts', { method: 'DELETE' });
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-caruso/databases/(default)/documents', { method: 'DELETE' });
  for (let i = 0; i < 60; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  await crearUsuario('guillermo@test.com', 'clave-admin-1', 'XbYkLAgjmKQQJB6kOuUnzTqxdnP2');

  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errores = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); }; });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errores.push(e.message));
  const impresiones = () => pg.evaluate(() => window.__impresiones);
  const ir = async (ruta) => { await pg.evaluate((r) => { location.hash = r; }, ruta); await pg.waitForTimeout(300); };

  await pg.goto(BASE);
  await pg.fill('#loginEmail', 'guillermo@test.com'); await pg.fill('#loginClave', 'clave-admin-1'); await pg.click('#loginBtn');
  await pg.waitForSelector('.page-title:has-text("Hola")');
  ok('ingreso del administrador', true);

  // ---------- importar ----------
  await ir('#/importar');
  await pg.setInputFiles('#impArchivo', CSV);
  await pg.waitForSelector('text=3. Vista previa');
  const vistaPrevia = await pg.locator('.stat-tile').allInnerTexts();
  ok('vista previa: 4 contratos, 4 propiedades, 1 fila con error — ' + vistaPrevia.join(' | ').replace(/\n/g, ' '), vistaPrevia[0].startsWith('4') && vistaPrevia[1].startsWith('4') && vistaPrevia[3].startsWith('1'));
  ok('detecta la columna del inquilino', (await pg.locator('select[data-mapeo="inqNombre"] option:checked').innerText()) === 'Inquilino');
  await pg.screenshot({ path: SHOTS + '/importar.png', fullPage: true });
  await pg.click('[data-accion="importar-confirmar"]');
  await pg.click('#confirmarBtn');
  await pg.waitForSelector('.page-title:has-text("Contratos")');
  await pg.waitForSelector('td:has-text("0154")');
  ok('importa y muestra los contratos activos', (await pg.locator('tbody tr').count()) === 3);
  await ir('#/personas');
  await ir('#/contratos');
  ok('el contrato cuatrimestral se importa cada 4 meses', (await pg.evaluate(async () => { const m = await import('/src/services/datos.js'); return m.datos().contratos.find((c) => c.numero === '0151').frecuencia; })) === 4);
  await ir('#/personas');
  ok('no duplica a Carlos Pérez (propietario de 2 contratos)', (await pg.locator('td:has-text("Pérez, Carlos")').count()) === 1);

  // ---------- carga a mano: persona, propiedad y contrato ----------
  await ir('#/propiedades');
  await pg.click('[data-accion="nueva-propiedad"]');
  await pg.fill('#prDir', 'Güemes 120'); await pg.fill('#prLoc', 'Moreno');
  await pg.click('#prNuevoOwner');
  await pg.fill('#peNombre', 'Marta'); await pg.fill('#peApellido', 'Gómez'); await pg.fill('#peDni', '20.115.884'); await pg.fill('#peTel', '11 3322-9087');
  await pg.click('#peGuardar');
  await pg.waitForSelector('#prDir');
  await pg.waitForTimeout(400);
  ok('al crear el propietario vuelve a la propiedad sin perder lo escrito', (await pg.inputValue('#prDir')) === 'Güemes 120' && (await pg.inputValue('#prOwner')) !== '');
  await pg.click('#prGuardar');
  await pg.waitForSelector('.ficha-title:has-text("Güemes 120")');
  ok('propiedad creada y ficha abierta', true);
  await pg.click('.tab-btn:has-text("Contrato")');
  await pg.click('[data-accion="nuevo-contrato"]');
  await pg.fill('#ctNumero', '0172');
  await pg.click('[data-nueva-persona="ctTenant"]');
  await pg.fill('#peNombre', 'Andrés'); await pg.fill('#peApellido', 'Villalba'); await pg.fill('#peTel', '11 4467-9982');
  await pg.click('#peGuardar');
  await pg.waitForSelector('#ctNumero');
  await pg.waitForTimeout(400);
  await pg.fill('#ctInicio', ''); await pg.type('#ctInicio', '01092025');
  ok('la fecha se escribe dd/mm/aaaa con las barras solas', (await pg.inputValue('#ctInicio')) === '01/09/2025');
  ok('el fin se completa solo a 2 años: ' + (await pg.inputValue('#ctFin')), (await pg.inputValue('#ctFin')) === '31/08/2027');
  await pg.fill('#ctAlquiler', '470000');
  await pg.click('#ctGaranteBuscar'); await pg.type('#ctGaranteBuscar', 'go');
  await pg.screenshot({ path: SHOTS + '/contrato-form.png' });
  await pg.keyboard.press('Escape'); await pg.fill('#ctGaranteBuscar', ''); await pg.click('#ctNumero');
  await pg.selectOption('#ctTipo', 'Fijo'); await pg.fill('#ctPct', '8'); await pg.selectOption('#ctFrec', '6'); await pg.fill('#ctProx', '01/09/2026');
  await pg.check('#ctExpAplica'); await pg.fill('#ctExpMonto', '15000');
  await pg.selectOption('#ctHonTipo', 'fijo'); await pg.fill('#ctHonValor', '40000');
  await pg.click('#ctGuardar');
  await pg.waitForSelector('.kv-value:has-text("0172")');
  ok('contrato cargado a mano con inquilino nuevo, % fijo, expensas y honorarios fijos', (await pg.locator('.kv-value:has-text("monto fijo")').count()) === 1);
  ok('ficha con fin 31/8/2027 y próxima actualización 1/9/2026', (await pg.locator('.kv-value:has-text("31/8/2027")').count()) === 1 && (await pg.locator('.kv-value:has-text("1/9/2026")').count()) === 1);
  await pg.screenshot({ path: SHOTS + '/ficha-contrato.png', fullPage: true });
  await pg.click('[data-accion="nuevo-contrato"]').catch(() => {});

  // ---------- aumentos ----------
  await ir('#/aumentos');
  await pg.fill('#idxIcl', '7.5'); await pg.click('[data-accion="guardar-indices"]');
  await pg.waitForTimeout(500);
  const filaBelgrano = pg.locator('tr:has-text("Belgrano 1234")');
  ok('sugiere 610.000 + 7,5% = 655.750 → 656.000 (redondeado a $1.000)', (await filaBelgrano.locator('input').inputValue()) === '656000');
  await filaBelgrano.locator('[data-accion="whatsapp-aumento"]').click();
  const wa = await pg.evaluate(() => window.__abiertos.at(-1));
  ok('WhatsApp al inquilino con el monto nuevo y sin el monto anterior', wa.startsWith('https://wa.me/5491122117765') && decodeURIComponent(wa).includes('656.000') && !decodeURIComponent(wa).includes('antes'));
  await filaBelgrano.locator('[data-accion="nota-aumento"]').click();
  ok('nota de aumento impresa', (await impresiones()) === 1 && (await pg.locator('#printArea').innerText()).includes('Notificación de actualización'));
  await pg.screenshot({ path: SHOTS + '/aumentos.png', fullPage: true });
  await filaBelgrano.locator('input').fill('660000');
  await filaBelgrano.locator('[data-accion="aplicar-aumento"]').click();
  ok('pide confirmar el aumento con los montos', (await pg.locator('.modal-box').innerText()).includes('$ 660.000'));
  await pg.click('#confirmarBtn');
  await pg.waitForTimeout(600);
  const c154 = async () => (await pg.locator('tr:has-text("Belgrano 1234") td.num').first().innerText()).trim();
  ok('aplica el aumento con monto corregido a mano: ' + (await c154()), (await c154()) === '$ 660.000');
  await pg.click('#toastUndo');
  await pg.waitForTimeout(600);
  ok('deshacer aumento vuelve a 610.000', (await c154()) === '$ 610.000');
  // sin IPC cargado no deja actualizar un contrato por IPC
  await ir('#/aumentos?ver=todos');
  const filaIpc = pg.locator('tr:has-text("Sarmiento 342")');
  ok('contrato por IPC sin índice: el monto queda vacío', (await filaIpc.locator('input').inputValue()) === '' && (await filaIpc.locator('input').getAttribute('placeholder')) === 'Falta IPC');
  await filaIpc.locator('[data-accion="aplicar-aumento"]').click();
  ok('no deja actualizar sin el IPC del mes', (await pg.locator('#toast').innerText()).includes('Falta cargar el IPC') && !(await pg.locator('#modalOverlay.show').count()));
  // deshacer un aumento días después, desde la ficha del contrato
  await filaBelgrano.locator('[data-accion="aplicar-aumento"]').click();
  await pg.click('#confirmarBtn');
  await pg.waitForTimeout(600);
  await ir('#/contratos');
  await pg.click('tr:has-text("Belgrano 1234")');
  await pg.click('.tab-btn:has-text("Contrato")');
  await pg.click('[data-accion="deshacer-aumento"]');
  await pg.click('#confirmarBtn');
  await pg.waitForTimeout(600);
  ok('deshacer el aumento desde la ficha: vuelve a 610.000 y sin historial', (await pg.locator('.kv-value:has-text("$ 610.000")').count()) === 1 && (await pg.locator('[data-accion="deshacer-aumento"]').count()) === 0);
  await ir('#/aumentos');

  // ---------- cobranzas y recibos ----------
  await ir('#/cobranzas');
  await pg.waitForSelector('tr:has-text("Güemes 120")');
  const filaGuemes = pg.locator('tr:has-text("Güemes 120")');
  ok('el cobro del mes sale del contrato con sus expensas (470.000 + 15.000)', (await filaGuemes.locator('td.num').innerText()).includes('485.000'));
  await filaGuemes.locator('[data-accion="cobrar"]').click();
  await pg.fill('#coServ', '8000');
  ok('el total se recalcula al sumar servicios', (await pg.inputValue('#coTotal')) === '$ 493.000');
  await pg.selectOption('#coMedio', 'Transferencia');
  await pg.click('#coOk');
  await pg.waitForSelector('.receipt-box');
  ok('recibo con monto en letras', (await pg.locator('.modal-box').innerText()).includes('Cuatrocientos noventa y tres mil pesos'));
  ok('el recibo aclara que no es factura', (await pg.locator('.modal-box').innerText()).includes('NO VÁLIDO COMO FACTURA'));
  await pg.screenshot({ path: SHOTS + '/recibo.png' });
  await pg.click('#imprimirRecibo');
  ok('imprime el recibo', (await impresiones()) === 2);
  await pg.click('[data-cerrar]');
  await pg.waitForSelector('tr:has-text("Güemes 120") .badge:has-text("Pagado")');
  ok('queda Pagado con medio de pago', (await pg.locator('tr:has-text("Güemes 120")').innerText()).includes('Transferencia'));
  // pago parcial
  const filaSar = pg.locator('tr:has-text("Sarmiento 342")');
  await filaSar.locator('[data-accion="cobrar"]').click();
  await pg.fill('#coMonto', '300000'); await pg.click('#coOk');
  await pg.waitForSelector('.receipt-box');
  ok('pago parcial: recibo "a cuenta" por lo cobrado', (await pg.locator('.modal-box').innerText()).includes('300.000 (pago a cuenta)'));
  await pg.click('[data-cerrar]');
  await pg.waitForSelector('tr:has-text("Sarmiento 342") .badge:has-text("Parcial")');
  ok('queda Parcial', true);
  await pg.screenshot({ path: SHOTS + '/cobranzas.png', fullPage: true });
  await pg.click('[data-accion="recibos-del-mes"]');
  ok('avisa los contratos con actualización pendiente antes de imprimir', (await pg.locator('.modal-box').innerText()).includes('Belgrano 1234'));
  await pg.click('#rcOk');
  const docs = await pg.locator('#printArea .doc-page').count();
  ok(`recibos del mes: planilla + 2 por hoja (${docs} hojas para 4 alquileres)`, docs === 3 && (await impresiones()) === 3);
  await pg.click('tr:has-text("Güemes 120") [data-accion="deshacer-cobro"]');
  await pg.waitForSelector('tr:has-text("Güemes 120") [data-accion="cobrar"]');
  ok('deshacer cobro lo vuelve a pendiente', true);

  // ---------- buscador y ficha ----------
  await pg.fill('#buscadorGlobal', 'molina');
  await pg.waitForSelector('#resultados.show');
  await pg.click('#resultados .search-result >> nth=0');
  await pg.waitForSelector('.ficha-title:has-text("Sarmiento 340")');
  ok('buscador global encuentra la propiedad por el inquilino', true);
  await pg.click('.tab-btn:has-text("Cobros")');
  ok('ficha muestra el historial de cobros', (await pg.locator('tbody tr').count()) >= 1);

  // ---------- selector de personas con búsqueda ----------
  await ir('#/propiedades');
  await pg.click('[data-accion="nueva-propiedad"]');
  await pg.click('#prOwnerBuscar');
  const opcionesAntes = await pg.locator('.combo-lista.show .combo-op').count();
  await pg.type('#prOwnerBuscar', 'perez');
  ok(`buscar personas por descarte: ${opcionesAntes} → ${await pg.locator('.combo-lista.show .combo-op').count()} con "perez" (sin tilde)`, opcionesAntes > 1 && (await pg.locator('.combo-lista.show .combo-op').count()) === 1);
  await pg.keyboard.press('Enter');
  ok('Enter elige a Pérez, Carlos', (await pg.inputValue('#prOwnerBuscar')) === 'Pérez, Carlos' && (await pg.inputValue('#prOwner')) !== '');
  await pg.click('[data-cerrar]');

  // ---------- borrar lo cargado por error (administrador) ----------
  await ir('#/personas');
  await pg.click('[data-accion="nueva-persona"]');
  await pg.fill('#peNombre', 'Error'); await pg.fill('#peApellido', 'Deprueba'); await pg.check('.peRol[value="Contacto"]');
  await pg.click('#peGuardar');
  await pg.waitForSelector('td:has-text("Deprueba")');
  await pg.click('td:has-text("Deprueba")');
  await pg.click('[data-accion="borrar-persona"]');
  await pg.click('#confirmarBtn');
  await pg.waitForSelector('td:has-text("Deprueba")', { state: 'detached' });
  ok('borra una persona cargada por error', true);
  await pg.click('td:has-text("Pérez, Carlos")');
  await pg.click('[data-accion="borrar-persona"]');
  ok('no deja borrar a un propietario con propiedades', (await pg.locator('#toast').innerText()).includes('No se puede borrar') && (await pg.locator('td:has-text("Pérez, Carlos")').count()) === 1);
  await pg.keyboard.press('Escape');
  await ir('#/contratos');
  await pg.click('tr:has-text("Sarmiento 342")');
  await pg.waitForSelector('.ficha-title:has-text("Sarmiento 342")');
  await pg.click('.tab-btn:has-text("Contrato")');
  await pg.click('[data-accion="borrar-contrato"]');
  await pg.waitForTimeout(500);
  ok('no deja borrar un contrato con cobros', (await pg.locator('#toast').innerText()).includes('tiene cobros'));
  await ir('#/contratos');
  await pg.click('tr:has-text("Güemes 120")');
  await pg.waitForSelector('.ficha-title:has-text("Güemes 120")');
  await pg.click('[data-accion="borrar-propiedad"]');
  ok('no deja borrar una propiedad con contrato', (await pg.locator('#toast').innerText()).includes('Borrá primero el contrato'));
  await pg.click('.tab-btn:has-text("Contrato")');
  await pg.click('[data-accion="borrar-contrato"]');
  await pg.click('#confirmarBtn');
  await pg.waitForTimeout(600);
  ok('borra un contrato sin cobros', !(await pg.evaluate(async () => { const m = await import('/src/services/datos.js'); return m.datos().contratos.some((c) => c.numero === '0172'); })));
  await pg.click('#toastUndo');
  await pg.waitForTimeout(600);
  ok('deshacer recupera el contrato borrado', await pg.evaluate(async () => { const m = await import('/src/services/datos.js'); return m.datos().contratos.some((c) => c.numero === '0172'); }));

  // ---------- importar el Excel de Arcomercial tal cual ----------
  await ir('#/importar');
  await pg.setInputFiles('#impArchivo', XLSX);
  await pg.waitForSelector('text=3. Vista previa');
  const tiles = await pg.locator('.stat-tile').allInnerTexts();
  ok('lee el .xlsx directo: 2 contratos, 0 errores — ' + tiles.join(' | ').replace(/\n/g, ' '), tiles[0].startsWith('2') && tiles[3].startsWith('0'));
  const previa = await pg.locator('#view').innerText();
  ok('tildes y Ñ intactas, mayúsculas a nombre propio, "/" = dos inquilinos', previa.includes('Albesa, María y Luque, Juan') && previa.includes('Peña, Ana'));
  ok('fechas del Excel bien leídas', previa.includes('1/3/2026') && previa.includes('28/2/2028'));
  ok('avisa que faltan las frecuencias y deja elegirla', previa.includes('Revisar aumento') && (await pg.locator('#impFrec').count()) === 1);
  await pg.selectOption('#impFrec', '4');
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: SHOTS + '/importar-xlsx.png', fullPage: true });
  await pg.click('[data-accion="importar-confirmar"]');
  await pg.click('#confirmarBtn');
  await pg.waitForSelector('.page-title:has-text("Contratos")');
  await pg.waitForSelector('td:has-text("472")');
  await pg.click('[data-valor="revisar"]');
  await pg.waitForTimeout(300);
  ok('filtro "Revisar aumento" con los 2 importados: ' + (await pg.locator('#view tbody tr').allInnerTexts()).join(' / ').replace(/\s+/g, ' '), (await pg.locator('#view tbody tr').count()) === 2);
  await pg.click('tr:has-text("472")');
  await pg.click('.tab-btn:has-text("Contrato")');
  ok('la ficha explica qué revisar', (await pg.locator('.note-banner').innerText()).includes('Revisar aumento'));
  await pg.click('[data-accion="editar-contrato"]');
  ok('se importó cada 4 meses', (await pg.inputValue('#ctFrec')) === '4');
  await pg.click('#ctGuardar');
  await pg.waitForTimeout(600);
  ok('al guardar el contrato se quita la marca', (await pg.locator('.note-banner').count()) === 0);

  ok('sin errores en la página: ' + JSON.stringify(errores), errores.length === 0);
  await b.close();
} finally {
  vite.kill();
}
