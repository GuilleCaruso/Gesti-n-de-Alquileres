// Campos de formulario propios: fecha en dd/mm/aaaa y selector de personas con búsqueda.
// Se activan solos al abrir una ventana (abrirModal llama a prepararCampos).
import { esc, isoATexto, leerFecha } from '../domain/formato.js';

const calendario = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

// ---------- fecha dd/mm/aaaa ----------
// El navegador muestra los campos de fecha en el formato del idioma de Chrome (mm/dd/aaaa si está en inglés).
// Este campo es texto: siempre dd/mm/aaaa, y el botón del calendario abre el selector igual.
export const inputFecha = (id, iso) => `
  <div class="fecha-wrap">
    <input type="text" id="${id}" data-fecha inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" autocomplete="off" value="${esc(isoATexto(iso || ''))}">
    <button type="button" class="fecha-btn" data-calendario="${id}" tabindex="-1" aria-label="Elegir en el calendario">${calendario}</button>
    <input type="date" class="fecha-oculta" data-para="${id}" tabindex="-1" aria-hidden="true">
  </div>`;

// Lee un campo de fecha: ISO, '' si está vacío, null si está mal escrito.
export const fecha = (id) => leerFecha(document.getElementById(id)?.value);

// Escribe una fecha ISO en un campo de fecha.
export function ponerFecha(id, iso) {
  const el = document.getElementById(id);
  if (el) el.value = isoATexto(iso || '');
}

function prepararFecha(el) {
  el.addEventListener('input', (e) => {
    if (!e.inputType || !e.inputType.startsWith('insert')) return;
    // agrega las barras solas mientras se escribe: 01 → 01/ → 01/09/ → 01/09/2025
    if (/^\d{2}$/.test(el.value) || /^\d{1,2}\/\d{2}$/.test(el.value)) el.value += '/';
  });
  el.addEventListener('blur', () => {
    const iso = leerFecha(el.value);
    el.classList.toggle('invalido', iso === null);
    if (iso) el.value = isoATexto(iso);
  });
  const wrap = el.closest('.fecha-wrap');
  const oculta = wrap.querySelector('.fecha-oculta');
  wrap.querySelector('.fecha-btn').addEventListener('click', () => {
    oculta.value = leerFecha(el.value) || '';
    try { oculta.showPicker(); } catch { oculta.focus(); oculta.click(); }
  });
  oculta.addEventListener('change', () => {
    if (!oculta.value) return;
    el.value = isoATexto(oculta.value);
    el.classList.remove('invalido');
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// ---------- selector de personas con búsqueda ----------
const opcionesCombo = new Map();
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const etiqueta = (p) => `${p.apellido || ''}, ${p.nombre || ''}`;

// `id` es el campo que se lee (oculto, con el id de la persona). Se escribe en `id`Buscar.
export function comboPersona(id, personas, valor, placeholder = 'Escribí nombre, apellido o DNI…') {
  const lista = personas.slice().sort((a, b) => etiqueta(a).localeCompare(etiqueta(b)))
    .map((p) => ({ id: p.id, texto: etiqueta(p), sub: [p.dni && 'DNI ' + p.dni, (p.roles || []).join(' · ')].filter(Boolean).join(' · '),
      palabras: normalizar([p.apellido, p.nombre, p.dni, (p.dni || '').replace(/\D/g, '')].join(' ')).split(/[\s,]+/).filter(Boolean) }));
  opcionesCombo.set(id, lista);
  const sel = lista.find((o) => o.id === valor);
  return `
    <div class="combo">
      <input type="hidden" id="${id}" value="${esc(sel ? sel.id : '')}">
      <input type="text" id="${id}Buscar" class="combo-input" data-combo="${id}" placeholder="${esc(placeholder)}" autocomplete="off" value="${esc(sel ? sel.texto : '')}">
      <div class="combo-lista" role="listbox"></div>
    </div>`;
}

// Cambia la persona elegida de un selector (por ejemplo, al volver de "Nueva persona").
export function elegirPersona(id, personaId) {
  const o = (opcionesCombo.get(id) || []).find((x) => x.id === personaId);
  const oculto = document.getElementById(id);
  const texto = document.getElementById(id + 'Buscar');
  if (oculto) oculto.value = o ? o.id : '';
  if (texto) texto.value = o ? o.texto : '';
}

function prepararCombo(input) {
  const id = input.dataset.combo;
  const oculto = document.getElementById(id);
  const caja = input.parentElement.querySelector('.combo-lista');
  let visibles = [], marcado = 0;
  const elegido = () => (opcionesCombo.get(id) || []).find((o) => o.id === oculto.value);
  const cerrar = () => { caja.classList.remove('show'); };
  const pintar = () => {
    const palabras = normalizar(input.value).split(/\s+/).filter(Boolean);
    const todas = opcionesCombo.get(id) || [];
    // "por descarte": cada palabra escrita tiene que ser el comienzo de un nombre, apellido o DNI
    const filtradas = todas.filter((o) => palabras.every((w) => o.palabras.some((x) => x.startsWith(w))));
    visibles = filtradas.slice(0, 8);
    marcado = Math.min(marcado, Math.max(0, visibles.length - 1));
    caja.innerHTML = visibles.length
      ? visibles.map((o, i) => `<div class="combo-op ${i === marcado ? 'marcado' : ''}" data-i="${i}"><div>${esc(o.texto)}</div>${o.sub ? `<div class="combo-sub">${esc(o.sub)}</div>` : ''}</div>`).join('')
        + (filtradas.length > visibles.length ? `<div class="combo-mas">y ${filtradas.length - visibles.length} más: seguí escribiendo para achicar la lista</div>` : '')
      : '<div class="combo-mas">Nadie coincide. Si es nueva, creala con "Nueva".</div>';
    caja.classList.add('show');
  };
  const tomar = (o) => { oculto.value = o.id; input.value = o.texto; cerrar(); };
  input.addEventListener('focus', () => { input.select(); marcado = 0; pintar(); });
  input.addEventListener('input', () => { oculto.value = ''; marcado = 0; pintar(); });
  input.addEventListener('keydown', (e) => {
    if (!caja.classList.contains('show')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcado = Math.min(marcado + 1, visibles.length - 1); pintar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcado = Math.max(marcado - 1, 0); pintar(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (visibles[marcado]) tomar(visibles[marcado]); }
    else if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
  });
  // mousedown (no click) para elegir antes de que el campo pierda el foco
  caja.addEventListener('mousedown', (e) => {
    const op = e.target.closest('.combo-op');
    if (op) { e.preventDefault(); tomar(visibles[Number(op.dataset.i)]); }
  });
  input.addEventListener('blur', () => {
    cerrar();
    if (!input.value.trim()) { oculto.value = ''; return; }
    if (!oculto.value && visibles.length === 1) { tomar(visibles[0]); return; }
    // si quedó texto suelto que no es una persona, vuelve a la elegida (o se vacía)
    const o = elegido();
    input.value = o ? o.texto : '';
  });
}

export function prepararCampos(box) {
  box.querySelectorAll('[data-fecha]').forEach(prepararFecha);
  box.querySelectorAll('[data-combo]').forEach(prepararCombo);
}
