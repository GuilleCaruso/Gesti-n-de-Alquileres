// Piezas comunes de pantalla: ventanas emergentes, avisos con "Deshacer", impresión y links de WhatsApp.
import { esc, fdate } from '../domain/formato.js';
import { icon } from './icons.js';
import { prepararCampos } from './campos.js';

export const INMOBILIARIA = { nombre: 'Caruso Propiedades', localidad: 'Paso del Rey, Moreno', telefono: '11 3449-8819', email: 'info@carusopropiedades.com' };
export const LOGO = '/logo-caruso.png';

export const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const periodoActual = () => hoyIso().slice(0, 7);

// Usuario que está usando la app (lo fija el shell al entrar).
let perfilActual = null;
export const fijarPerfil = (p) => { perfilActual = p; };
export const soyAdmin = () => !!perfilActual && perfilActual.rol === 'admin' && perfilActual.activo === true;

// ---------- ventanas emergentes ----------
export function abrirModal(html, ancho) {
  const m = document.getElementById('modalOverlay');
  const box = m.querySelector('.modal-box');
  box.innerHTML = html;
  box.classList.toggle('wide', !!ancho);
  m.classList.add('show');
  prepararCampos(box);
  const primero = box.querySelector('input:not([disabled]):not([type=hidden]):not(.fecha-oculta), select:not([disabled]), textarea');
  if (primero) primero.focus();
  return box;
}
export const cerrarModal = () => document.getElementById('modalOverlay').classList.remove('show');
export const modalAbierto = () => document.getElementById('modalOverlay').classList.contains('show');

export function confirmar(mensaje, alConfirmar) {
  const box = abrirModal(`
    <div class="section-title" style="margin-bottom:10px;">Confirmar</div>
    <div style="margin-bottom:18px;">${esc(mensaje)}</div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn" data-cerrar>Cancelar</button>
      <button class="btn btn-primary" id="confirmarBtn">Confirmar</button>
    </div>`);
  box.querySelector('#confirmarBtn').onclick = () => { cerrarModal(); alConfirmar(); };
}

// Lee los campos de un formulario por id: leer('nombre') → texto sin espacios de más.
export const campo = (id) => (document.getElementById(id)?.value ?? '').trim();
export const numero = (id) => { const v = parseFloat(campo(id).replace(',', '.')); return Number.isFinite(v) ? v : 0; };
export const tildado = (id) => !!document.getElementById(id)?.checked;

// Botones de pie de formulario.
export const botonesModal = (textoOk, idOk) => `
  <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
    <button class="btn" data-cerrar>Cancelar</button>
    <button class="btn btn-primary" id="${idOk}">${esc(textoOk)}</button>
  </div>`;

// Ejecuta una escritura mostrando un error claro si falla (sin conexión, sin permiso).
export async function intentar(fn, mensajeOk, deshacer) {
  try {
    await fn();
    if (mensajeOk) aviso(mensajeOk, deshacer);
    return true;
  } catch (e) {
    console.error(e);
    aviso('No se pudo guardar. Revisá la conexión e intentá de nuevo.');
    return false;
  }
}

// ---------- avisos ----------
let timer = null;
export function aviso(msg, deshacer) {
  const t = document.getElementById('toast');
  t.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>' + (deshacer ? '<button class="toast-undo" id="toastUndo">Deshacer</button>' : '');
  if (deshacer) t.querySelector('#toastUndo').onclick = () => { t.classList.remove('show'); deshacer(); };
  t.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove('show'), deshacer ? 7000 : 2800);
}

// ---------- impresión ----------
export function imprimir(paginas) {
  document.getElementById('printArea').innerHTML = `<div class="doc">${paginas.map((h) => `<div class="doc-page">${h}</div>`).join('')}</div>`;
  // print() en el mismo clic: con demora, algunos navegadores lo bloquean
  window.print();
}
export function docHead(titulo, sub) {
  return `<div class="doc-head">
    <img class="doc-logo" src="${LOGO}" alt="">
    <div class="doc-org"><b>${esc(INMOBILIARIA.nombre)}</b><div>${esc(INMOBILIARIA.localidad)}</div><div>${esc(INMOBILIARIA.telefono)} · ${esc(INMOBILIARIA.email)}</div></div>
    <div class="doc-title"><h2>${esc(titulo)}</h2><div>${sub}</div></div>
  </div>`;
}
export const docFoot = () => `<div class="doc-foot">Impreso el ${fdate(hoyIso())} · ${esc(INMOBILIARIA.nombre)}</div>`;

// ---------- WhatsApp ----------
// Dónde se abre WhatsApp en ESTA computadora: 'web' (WhatsApp Web en Chrome) o 'app' (WhatsApp de escritorio).
// Cada PC puede tener un número distinto en cada uno, por eso se guarda en el navegador y no en la base.
const CLAVE_WA = 'caruso.whatsapp';
export const modoWhatsApp = () => { try { return localStorage.getItem(CLAVE_WA) === 'app' ? 'app' : 'web'; } catch { return 'web'; } };
export const fijarModoWhatsApp = (m) => { try { localStorage.setItem(CLAVE_WA, m === 'app' ? 'app' : 'web'); } catch { /* sin almacenamiento: queda en web */ } };

export function linkWhatsApp(telefono, mensaje, modo = modoWhatsApp()) {
  let d = String(telefono || '').replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('9')) d = d.slice(1);
  const q = `phone=549${d}&text=${encodeURIComponent(mensaje)}`;
  return modo === 'app' ? `whatsapp://send?${q}` : `https://web.whatsapp.com/send?${q}`;
}

// WhatsApp Web se abre siempre en la misma pestaña (no una nueva por cada aviso).
export function abrirWhatsApp(telefono, mensaje) {
  const url = linkWhatsApp(telefono, mensaje);
  if (modoWhatsApp() === 'app') window.open(url, '_self');
  else window.open(url, 'caruso-whatsapp');
}

export const lupa = '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
