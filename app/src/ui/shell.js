// Estructura de la app logueada: barra lateral, barra superior y navegación por #/seccion.
import { esc } from '../domain/formato.js';
import { esAdmin, puedeEntrar, SECCIONES, seccionesSistema } from '../domain/permisos.js';
import { salir } from '../services/sesion.js';
import { icon } from './icons.js';
import { ETAPA_ACTUAL, montarUsuarios, vistaConfiguracion, vistaEnConstruccion, vistaInicio, vistaUsuarios } from './vistas.js';

export function montarShell(root, perfil) {
  root.innerHTML = `
    <div class="overlay" id="navOverlay"></div>
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><img class="brand-logo" src="/logo-caruso.png" alt="Caruso Propiedades" style="display:block; width:100%; max-width:170px; border-radius:8px;"></div>
        <nav class="nav" id="navList"></nav>
        <div class="sidebar-foot"><div class="proto-tag"><span class="proto-dot"></span>Etapa ${ETAPA_ACTUAL} de 9 · en construcción</div></div>
      </aside>
      <div class="main">
        <div class="topbar">
          <button class="hamburger" id="hamburgerBtn" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
          <div class="topbar-right">
            <span class="user-chip">${esc(perfil.nombre)} · ${esAdmin(perfil) ? 'Administrador' : 'Empleado'}</span>
            <button class="btn btn-sm" id="salirBtn">Salir</button>
          </div>
        </div>
        <div class="content"><div class="content-inner" id="view"></div></div>
      </div>
    </div>`;

  const seccionActual = () => (location.hash.slice(2).split('?')[0] || 'inicio');

  function pintarMenu(activa) {
    const item = (s) => `<button class="nav-item ${s.key === activa ? 'active' : ''}" data-nav="${s.key}">${icon(s.icon)}<span>${esc(s.label)}</span></button>`;
    document.getElementById('navList').innerHTML =
      SECCIONES.map(item).join('') + `<div class="nav-label">Sistema</div>` + seccionesSistema(perfil).map(item).join('');
  }

  function route() {
    let key = seccionActual();
    if (!puedeEntrar(key, perfil)) key = 'inicio';
    const view = document.getElementById('view');
    if (key === 'inicio') view.innerHTML = vistaInicio(perfil);
    else if (key === 'usuarios') { view.innerHTML = vistaUsuarios(); montarUsuarios(perfil, route); }
    else if (key === 'configuracion') view.innerHTML = vistaConfiguracion();
    else view.innerHTML = vistaEnConstruccion(key);
    pintarMenu(key);
    document.body.classList.remove('sidebar-open');
    window.scrollTo(0, 0);
  }

  root.querySelector('#navList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-nav]');
    if (b) location.hash = '#/' + b.dataset.nav;
  });
  root.querySelector('#salirBtn').addEventListener('click', () => salir());
  root.querySelector('#hamburgerBtn').addEventListener('click', () => document.body.classList.add('sidebar-open'));
  root.querySelector('#navOverlay').addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  window.onhashchange = route;
  route();
}
