// Vistas generales: Inicio, Usuarios y Configuración.
import { esc, periodoLabel, totalMonedas } from '../domain/formato.js';
import { deudas, cobrosDelMes, contratosActivos, contratosPorVencer, contratoVencido } from '../domain/consultas.js';
import { copiaCompleta, diasSinCopia, hojasCopia } from '../domain/copia.js';
import { leerTodo } from '../services/datos.js';
import { esAdmin } from '../domain/permisos.js';
import { pagoTotal, pendienteActualizacion } from '../domain/negocio.js';
import { actualizarUsuario, darAcceso, listarUsuarios } from '../services/usuarios.js';
import { fijarModoWhatsApp, hoyIso, modoWhatsApp, periodoActual } from './base.js';
import { icon } from './icons.js';
import { toast } from './toast.js';

export function vistaInicio(perfil, d) {
  const periodo = periodoActual();
  const hoy = hoyIso();
  const cobros = cobrosDelMes(d.contratos, d.pagos, periodo, hoy);
  const porVencer = contratosPorVencer(d.contratos, hoy);
  const yaVencidos = porVencer.filter((c) => contratoVencido(c, hoy)).length;
  const sinCopia = diasSinCopia(ultimaCopia(), hoy);
  const conDeuda = deudas(d.contratos, d.pagos, hoy).length;
  const pagados = cobros.filter((p) => p.estado === 'Pagado').length;
  const falta = totalMonedas(cobros.map((p) => [p.estado === 'Pagado' ? 0 : pagoTotal(p) - (p.estado === 'Parcial' ? p.pagado || 0 : 0), p.moneda]));
  const aumentos = contratosActivos(d.contratos).filter((c) => pendienteActualizacion(c, hoy)).length;
  const tile = (valor, label, nav, tono) => `<button class="stat-tile" data-nav="${nav}" style="cursor:pointer; text-align:left; font:inherit; color:inherit;"><div class="stat-value tnum" style="color:var(--${tono}-600);">${valor}</div><div class="stat-label">${label}</div></button>`;
  return `
    <div class="page-head"><div><h1 class="page-title">Hola, ${esc(perfil.nombre)}</h1><div class="page-sub">${esAdmin(perfil) ? 'Administrador' : 'Empleado'} · ${periodoLabel(periodo)}</div></div></div>
    ${!d.listo ? '<div class="empty-state">Cargando datos…</div>' : `
    <div class="stat-grid">
      ${tile(`${pagados} / ${cobros.length}`, 'Alquileres cobrados este mes', '/cobranzas', 'ok')}
      ${tile(conDeuda, 'Inquilinos con deuda', '/deudores', conDeuda ? 'danger' : 'ok')}
      ${esAdmin(perfil) ? tile(falta, 'Falta cobrar este mes', '/cobranzas', 'warn') : tile(cobros.length - pagados, 'Alquileres por cobrar este mes', '/cobranzas', 'warn')}
      ${tile(aumentos, 'Aumentos pendientes', '/aumentos', aumentos ? 'warn' : 'ok')}
    </div>
    ${porVencer.length ? `<div class="note-banner ${yaVencidos ? '' : 'info'}" style="margin-bottom:12px;">${icon('alert')}<div>${yaVencidos ? `<b>${yaVencidos} contrato(s) vencido(s)</b> sin renovar ni finalizar` : ''}${yaVencidos && porVencer.length > yaVencidos ? ' y ' : ''}${porVencer.length > yaVencidos ? `<b>${porVencer.length - yaVencidos}</b> que vence(n) en los próximos 60 días` : ''}. <a data-nav="/contratos?filtro=porvencer" style="text-decoration:underline; cursor:pointer;">Ver la lista</a></div></div>` : ''}
    ${esAdmin(perfil) && d.contratos.length && (sinCopia === null || sinCopia >= 7) ? `<div class="note-banner info" style="margin-bottom:12px;">${icon('alert')}<div>${sinCopia === null ? 'Todavía no hiciste ninguna copia de seguridad en esta computadora.' : `Hace ${sinCopia} días que no hacés una copia de seguridad.`} <a data-nav="/configuracion" style="text-decoration:underline; cursor:pointer;">Hacerla ahora</a> (un minuto).</div></div>` : ''}
    ${d.contratos.length ? '' : `<div class="note-banner info">${icon('alert')}<div>Todavía no hay contratos cargados. ${esAdmin(perfil) ? 'Podés importarlos desde <b>Importar datos</b> o cargarlos a mano en <b>Contratos</b>.' : 'Pedile al administrador que importe los datos.'}</div></div>`}`}
    <div class="page-sub" style="margin-top:18px;">Próximamente: liquidaciones a propietarios, arreglos, caja y bancos.</div>`;
}

// La fecha de la última copia se recuerda en esta computadora.
const CLAVE_COPIA = 'caruso.ultimaCopia';
const ultimaCopia = () => { try { return localStorage.getItem(CLAVE_COPIA); } catch { return null; } };

function descargar(blob, nombreArchivo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function vistaConfiguracion(perfil) {
  const ult = ultimaCopia();
  return `
    <div class="page-head"><div><h1 class="page-title">Configuración</h1><div class="page-sub">Datos de la inmobiliaria que aparecen en recibos y liquidaciones</div></div></div>
    <div class="card card-pad"><div class="form-grid">
      <div class="field"><label>Nombre</label><input value="Caruso Propiedades" disabled></div>
      <div class="field"><label>Localidad</label><input value="Paso del Rey, Moreno" disabled></div>
      <div class="field"><label>Teléfono</label><input value="11 3449-8819" disabled></div>
      <div class="field"><label>Email</label><input value="info@carusopropiedades.com" disabled></div>
      <div class="field"><label>Honorarios por defecto</label><input value="5% (se define en cada contrato)" disabled></div>
    </div></div>
    ${esAdmin(perfil) ? `<div class="card card-pad" style="margin-top:16px;">
      <div class="section-title" style="margin-bottom:4px;">Copia de seguridad</div>
      <div class="page-sub" style="margin-bottom:12px;">Baja todo lo cargado (contratos, cobros, propiedades y personas) a tu computadora. Hacela una vez por semana y guardá los dos archivos en un lugar seguro (por ejemplo, tu Google Drive). ${ult ? `Última copia en esta computadora: <b>${esc(ult.slice(0, 10).split('-').reverse().join('/'))}</b>.` : '<b>Todavía no hiciste ninguna en esta computadora.</b>'}</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="btn btn-primary" id="cfgCopia">${icon('doc')}Descargar copia de seguridad</button>
        <span class="cell-sub">Son 2 archivos: un Excel para leer y un archivo ".json" que sirve para restaurar.</span>
      </div>
    </div>` : ''}
    <div class="card card-pad" style="margin-top:16px;">
      <div class="section-title" style="margin-bottom:4px;">WhatsApp en esta computadora</div>
      <div class="page-sub" style="margin-bottom:12px;">Dónde se abren los avisos de aumento. Se guarda en esta computadora: cada PC puede tener el suyo.</div>
      <div class="field" style="max-width:420px;"><label for="cfgWhatsapp">Abrir en</label>
        <select id="cfgWhatsapp">
          <option value="web" ${modoWhatsApp() === 'web' ? 'selected' : ''}>WhatsApp Web (en Chrome)</option>
          <option value="app" ${modoWhatsApp() === 'app' ? 'selected' : ''}>WhatsApp de escritorio (la aplicación)</option>
        </select></div>
    </div>`;
}

export function montarConfiguracion(alTerminar) {
  const copia = document.getElementById('cfgCopia');
  if (copia) copia.onclick = async () => {
    copia.disabled = true;
    try {
      toast('Preparando la copia…');
      const datos = await leerTodo();
      const ahora = new Date();
      const dia = hoyIso();
      const { default: escribirExcel } = await import('write-excel-file/universal');
      const excel = await escribirExcel(hojasCopia(datos)).toBlob();
      descargar(excel, `caruso-copia-${dia}.xlsx`);
      descargar(new Blob([copiaCompleta(datos, ahora.toISOString())], { type: 'application/json' }), `caruso-copia-${dia}.json`);
      try { localStorage.setItem(CLAVE_COPIA, dia); } catch { /* sin almacenamiento: no se recuerda la fecha */ }
      toast(`Copia lista: ${datos.contratos.length} contratos y ${datos.pagos.length} cobros`);
      if (alTerminar) alTerminar();
    } catch (e) {
      console.error(e);
      toast('No se pudo hacer la copia. Revisá la conexión e intentá de nuevo.');
    } finally {
      copia.disabled = false;
    }
  };
  const sel = document.getElementById('cfgWhatsapp');
  if (sel) sel.onchange = () => { fijarModoWhatsApp(sel.value); toast('Listo: WhatsApp se abre en ' + (sel.value === 'app' ? 'la aplicación de escritorio' : 'WhatsApp Web')); };
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
