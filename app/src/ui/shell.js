// Estructura de la app logueada: barra lateral, buscador global, navegación por #/seccion/id?parametros
// y despacho de los botones (data-accion) a cada módulo.
import { esc } from '../domain/formato.js';
import { buscar, contratoVigente, nombreCompleto } from '../domain/consultas.js';
import { esAdmin, puedeEntrar, SECCIONES, seccionesSistema } from '../domain/permisos.js';
import { alCambiar, datos, detenerDatos, iniciarDatos } from '../services/datos.js';
import { salir } from '../services/sesion.js';
import { cerrarModal, lupa, periodoActual } from './base.js';
import { icon } from './icons.js';
import { montarUsuarios, vistaConfiguracion, vistaInicio, vistaUsuarios } from './vistas.js';
import * as personas from './modulos/personas.js';
import * as propiedades from './modulos/propiedades.js';
import * as contratos from './modulos/contratos.js';
import * as aumentos from './modulos/aumentos.js';
import * as cobranzas from './modulos/cobranzas.js';
import * as importar from './modulos/importar.js';

const MODULOS = { personas, propiedades, contratos, aumentos, cobranzas, importar };
const ACCIONES = Object.assign({}, ...Object.values(MODULOS).map((m) => m.acciones || {}));

// un año de cobros para atrás alcanza para el día a día
let bajaCambios = null;

const desdeUnAnio = () => { const [y, m] = periodoActual().split('-').map(Number); return `${y - 1}-${String(m).padStart(2, '0')}`; };

export function montarShell(root, perfil) {
  root.innerHTML = `
    <div class="overlay" id="navOverlay"></div>
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><img class="brand-logo" src="/logo-caruso.png" alt="Caruso Propiedades" style="display:block; width:100%; max-width:170px; border-radius:8px;"></div>
        <nav class="nav" id="navList"></nav>
        <div class="sidebar-foot"><div class="proto-tag"><span class="proto-dot"></span>${esc(perfil.nombre)} · ${esAdmin(perfil) ? 'Administrador' : 'Empleado'}</div></div>
      </aside>
      <div class="main">
        <div class="topbar">
          <button class="hamburger" id="hamburgerBtn" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
          <div class="search-wrap">${lupa}<input class="search-input" id="buscadorGlobal" placeholder="Buscar dirección, propietario, inquilino, N° de contrato..." autocomplete="off"><div class="search-results" id="resultados"></div></div>
          <div class="topbar-right"><button class="btn btn-sm" id="salirBtn">Salir</button></div>
        </div>
        <div class="content"><div class="content-inner" id="view"></div></div>
      </div>
    </div>`;

  const leerRuta = () => {
    const [ruta, qs] = location.hash.slice(2).split('?');
    const [seccion, id] = (ruta || 'inicio').split('/');
    return { seccion: seccion || 'inicio', id, params: new URLSearchParams(qs || '') };
  };

  function pintarMenu(activa) {
    const item = (s) => `<button class="nav-item ${s.key === activa ? 'active' : ''}" data-nav="/${s.key}">${icon(s.icon)}<span>${esc(s.label)}</span></button>`;
    document.getElementById('navList').innerHTML = SECCIONES.map(item).join('') + `<div class="nav-label">Sistema</div>` + seccionesSistema(perfil).map(item).join('');
  }

  function render(volverArriba) {
    let { seccion, id, params } = leerRuta();
    if (!puedeEntrar(seccion, perfil)) seccion = 'inicio';
    const d = datos();
    const ctx = { d, perfil, id, params };
    // conservar el foco y el cursor si se está escribiendo en un filtro
    const activo = document.activeElement;
    const activoId = activo && activo.id && document.getElementById('view').contains(activo) ? activo.id : null;
    const cursor = activoId && typeof activo.selectionStart === 'number' ? activo.selectionStart : null;
    const view = document.getElementById('view');
    // conservar lo que el usuario escribió en campos editables (ej.: montos en Aumentos) si la pantalla se redibuja
    const editados = [...view.querySelectorAll('input[id]:not([data-filtro])')].filter((i) => i.type !== 'file' && i.value !== i.defaultValue).map((i) => [i.id, i.value]);
    if (seccion === 'inicio') view.innerHTML = vistaInicio(perfil, d);
    else if (seccion === 'usuarios') { view.innerHTML = vistaUsuarios(); montarUsuarios(perfil, () => render()); }
    else if (seccion === 'configuracion') view.innerHTML = vistaConfiguracion();
    else if (seccion === 'propiedades' && id) view.innerHTML = propiedades.vistaFicha(ctx);
    else view.innerHTML = MODULOS[seccion].vista(ctx);
    if (MODULOS[seccion] && MODULOS[seccion].montar) MODULOS[seccion].montar(ctx);
    pintarMenu(seccion);
    editados.forEach(([i, v]) => { const el = document.getElementById(i); if (el) el.value = v; });
    if (activoId) {
      const el = document.getElementById(activoId);
      if (el) { el.focus({ preventScroll: true }); if (cursor != null && el.setSelectionRange) try { el.setSelectionRange(cursor, cursor); } catch { /* inputs sin cursor */ } }
    }
    if (volverArriba) { document.body.classList.remove('sidebar-open'); window.scrollTo(0, 0); }
  }

  // cambia un parámetro de la ruta actual sin sumar historial (filtros, pestañas, mes)
  function setParam(clave, valor) {
    const { seccion, id, params } = leerRuta();
    if (valor) params.set(clave, valor); else params.delete(clave);
    const qs = params.toString();
    history.replaceState(null, '', `#/${seccion}${id ? '/' + id : ''}${qs ? '?' + qs : ''}`);
    render();
  }

  // ---------- clics ----------
  document.onclick = (e) => {
    if (!e.target.closest('.search-wrap')) ocultarResultados();
    if (e.target.id === 'modalOverlay') { cerrarModal(); return; }
    if (e.target.closest('[data-cerrar]')) cerrarModal();
    const acc = e.target.closest('[data-accion]');
    if (acc && ACCIONES[acc.dataset.accion]) { e.preventDefault(); ACCIONES[acc.dataset.accion]({ d: datos(), perfil, ds: acc.dataset, el: acc }); return; }
    const par = e.target.closest('[data-param]');
    if (par) { setParam(par.dataset.param, par.dataset.valor); return; }
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); location.hash = '#' + nav.dataset.nav; ocultarResultados(); }
  };
  document.oninput = (e) => {
    const f = e.target.closest('[data-filtro]');
    if (f && document.getElementById('view').contains(f)) setParam(f.dataset.filtro, f.value);
  };
  document.onkeydown = (e) => { if (e.key === 'Escape') { cerrarModal(); ocultarResultados(); } };

  // ---------- buscador global ----------
  const buscador = root.querySelector('#buscadorGlobal');
  const resultados = root.querySelector('#resultados');
  function ocultarResultados() { resultados.classList.remove('show'); }
  buscador.addEventListener('input', () => {
    const d = datos();
    const r = buscar(buscador.value, d);
    if (!buscador.value.trim()) { ocultarResultados(); return; }
    const P = (id) => d.personas.find((x) => x.id === id);
    resultados.innerHTML = (!r.propiedades.length && !r.personas.length) ? `<div class="search-empty">Sin resultados para "${esc(buscador.value)}"</div>` : `
      ${r.propiedades.length ? `<div class="search-group-label">Propiedades</div>${r.propiedades.map((pr) => { const c = contratoVigente(d.contratos, pr.id); return `<div class="search-result" data-nav="/propiedades/${esc(pr.id)}"><div class="search-result-title">${esc(pr.direccion)}</div><div class="search-result-sub">${esc(pr.localidad)} · ${c ? 'N° ' + esc(c.numero || '—') + ' · ' + esc(nombreCompleto(P(c.tenantId))) : 'sin contrato'}</div></div>`; }).join('')}` : ''}
      ${r.personas.length ? `<div class="search-group-label">Personas</div>${r.personas.map((p) => `<div class="search-result" data-accion="ver-persona" data-id="${esc(p.id)}"><div class="search-result-title">${esc(nombreCompleto(p))}</div><div class="search-result-sub">${esc((p.roles || []).join(' · '))}${p.dni ? ' · DNI ' + esc(p.dni) : ''}</div></div>`).join('')}` : ''}`;
    resultados.classList.add('show');
  });
  resultados.addEventListener('click', () => { buscador.value = ''; setTimeout(ocultarResultados, 0); });

  root.querySelector('#salirBtn').addEventListener('click', () => { detenerDatos(); salir(); });
  root.querySelector('#hamburgerBtn').addEventListener('click', () => document.body.classList.add('sidebar-open'));
  root.querySelector('#navOverlay').addEventListener('click', () => document.body.classList.remove('sidebar-open'));

  window.onhashchange = () => render(true);
  // los datos llegan en vivo: se vuelve a dibujar la pantalla (sin tocar ventanas abiertas)
  let pendiente = false;
  if (bajaCambios) bajaCambios();
  bajaCambios = alCambiar(() => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; render(); }); });
  iniciarDatos(perfil, desdeUnAnio());
  render(true);
}
