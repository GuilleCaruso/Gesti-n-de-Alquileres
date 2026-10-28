// Vistas de la etapa 1: Inicio, Usuarios, Configuración y "en construcción" para los módulos que vienen.
import { esc } from '../domain/formato.js';
import { esAdmin, SECCIONES } from '../domain/permisos.js';
import { actualizarUsuario, darAcceso, listarUsuarios } from '../services/usuarios.js';
import { icon } from './icons.js';
import { toast } from './toast.js';

const PROTOTIPO = 'https://claude.ai/artifact/4Mbn7nLqpn2jaFfhnBsaBU';

const ETAPAS = [
  [1, 'Base, ingreso y usuarios'], [2, 'Propiedades y personas'], [3, 'Contratos'], [4, 'Aumentos'],
  [5, 'Cobranzas y recibos'], [6, 'Deudores, servicios y arreglos'], [7, 'Liquidaciones'], [8, 'Caja y bancos'], [9, 'Archivos'],
];
export const ETAPA_ACTUAL = 1;

export function vistaInicio(perfil) {
  return `
    <div class="page-head"><div><h1 class="page-title">Hola, ${esc(perfil.nombre)}</h1><div class="page-sub">${esAdmin(perfil) ? 'Administrador' : 'Empleado'} · Caruso Propiedades</div></div></div>
    <div class="card card-pad">
      <div class="section-title">Avance de la construcción</div>
      <div class="page-sub" style="margin-bottom:8px;">La app se habilita módulo por módulo. Mientras tanto, el diseño completo se puede ver en el <a href="${PROTOTIPO}" target="_blank" rel="noopener">prototipo</a>.</div>
      <div class="task-list">${ETAPAS.map(([n, nombre]) => `
        <div class="task-row"><span class="task-dot" style="background:var(--${n < ETAPA_ACTUAL ? 'ok' : n === ETAPA_ACTUAL ? 'warn' : 'info'}-600)"></span>
          <div class="task-text"><b>Etapa ${n}</b> — ${esc(nombre)}</div>
          <span class="badge badge-${n < ETAPA_ACTUAL ? 'ok' : n === ETAPA_ACTUAL ? 'warn' : 'neutral'}">${n < ETAPA_ACTUAL ? 'Lista' : n === ETAPA_ACTUAL ? 'En prueba' : 'Pendiente'}</span></div>`).join('')}
      </div>
    </div>`;
}

export function vistaEnConstruccion(key) {
  const s = SECCIONES.find((x) => x.key === key);
  return `
    <div class="page-head"><div><h1 class="page-title">${esc(s.label)}</h1></div></div>
    <div class="empty-state card">${icon(s.icon)}<div class="empty-state-title">Se habilita en la etapa ${s.etapa}</div>
      <div>Mientras tanto podés ver cómo va a funcionar en el <a href="${PROTOTIPO}" target="_blank" rel="noopener">prototipo</a>.</div></div>`;
}

export function vistaConfiguracion() {
  return `
    <div class="page-head"><div><h1 class="page-title">Configuración</h1><div class="page-sub">Datos de la inmobiliaria que aparecen en recibos y liquidaciones</div></div></div>
    <div class="card card-pad"><div class="form-grid">
      <div class="field"><label>Nombre</label><input value="Caruso Propiedades" disabled></div>
      <div class="field"><label>Localidad</label><input value="Paso del Rey, Moreno" disabled></div>
      <div class="field"><label>Teléfono</label><input value="11 3449-8819" disabled></div>
      <div class="field"><label>Email</label><input value="info@carusopropiedades.com" disabled></div>
      <div class="field"><label>Honorarios por defecto</label><input value="5% (se define en cada contrato)" disabled></div>
    </div></div>`;
}

export function vistaUsuarios() {
  return `
    <div class="page-head"><div><h1 class="page-title">Usuarios</h1><div class="page-sub">Quién entra a la app y con qué rol. Solo lo ve el administrador.</div></div></div>
    <div class="table-wrap" style="margin-bottom:22px;" id="usuariosTabla"><div class="empty-state">Cargando…</div></div>
    <div class="card card-pad">
      <div class="section-title" style="margin-bottom:4px;">Dar acceso a un usuario nuevo</div>
      <div class="page-sub" style="margin-bottom:14px;">1) Crealo en Firebase → Authentication → Agregar usuario. 2) Copiá su <b>UID</b> (o pedile que entre a la app: le aparece en pantalla). 3) Completá acá.</div>
      <div class="form-grid" style="margin-bottom:14px;">
        <div class="field"><label>UID</label><input id="nuUid" placeholder="Ej: 8fK2…"></div>
        <div class="field"><label>Nombre</label><input id="nuNombre" placeholder="Ej: Laura"></div>
        <div class="field"><label>Email</label><input id="nuEmail" type="email"></div>
        <div class="field"><label>Rol</label><select id="nuRol"><option value="empleado">Empleado</option><option value="admin">Administrador</option></select></div>
      </div>
      <button class="btn btn-primary" id="nuGuardar">${icon('plus')}Dar acceso</button>
    </div>`;
}

export async function montarUsuarios(perfil, refrescar) {
  const tabla = document.getElementById('usuariosTabla');
  // los botones se conectan antes de cargar la lista, para que respondan desde el primer clic
  tabla.onchange = async (e) => {
    const sel = e.target.closest('[data-rol]');
    if (!sel) return;
    await actualizarUsuario(sel.dataset.rol, { rol: sel.value });
    toast('Rol actualizado');
  };
  tabla.onclick = async (e) => {
    const b = e.target.closest('[data-activo]');
    if (!b) return;
    await actualizarUsuario(b.dataset.activo, { activo: b.dataset.valor === '1' });
    toast(b.dataset.valor === '1' ? 'Acceso devuelto' : 'Acceso quitado');
    refrescar();
  };
  document.getElementById('nuGuardar').onclick = async () => {
    const v = (id) => document.getElementById(id).value.trim();
    if (!v('nuUid') || !v('nuNombre')) { toast('Completá UID y nombre'); return; }
    try {
      await darAcceso(v('nuUid'), { nombre: v('nuNombre'), email: v('nuEmail'), rol: v('nuRol') });
      toast('Acceso dado a ' + v('nuNombre'));
      refrescar();
    } catch {
      toast('No se pudo guardar. Revisá el UID.');
    }
  };
  try {
    const lista = await listarUsuarios();
    tabla.innerHTML = `<table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
      ${lista.map((u) => {
        const yo = u.uid === perfil.uid;
        return `<tr>
          <td class="cell-title">${esc(u.nombre)}${yo ? ' <span class="cell-sub">(vos)</span>' : ''}</td>
          <td>${esc(u.email || '—')}</td>
          <td><select data-rol="${esc(u.uid)}" ${yo ? 'disabled' : ''}><option value="empleado" ${u.rol === 'empleado' ? 'selected' : ''}>Empleado</option><option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option></select></td>
          <td>${u.activo ? '<span class="badge badge-ok">Activo</span>' : '<span class="badge badge-neutral">Sin acceso</span>'}</td>
          <td class="row-actions">${yo ? '' : `<button class="btn btn-sm" data-activo="${esc(u.uid)}" data-valor="${u.activo ? '0' : '1'}">${u.activo ? 'Quitar acceso' : 'Devolver acceso'}</button>`}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    tabla.innerHTML = `<div class="empty-state">No se pudo cargar la lista de usuarios.</div>`;
  }
}
