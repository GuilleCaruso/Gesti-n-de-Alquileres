// Personas: una sola ficha por persona, con uno o más roles (PROJECT_RULES 8).
import { esc } from '../../domain/formato.js';
import { contratoVigente, nombreCompleto } from '../../domain/consultas.js';
import { borrar, guardar } from '../../services/datos.js';
import { abrirModal, aviso, botonesModal, campo, cerrarModal, confirmar, intentar, lupa, soyAdmin } from '../base.js';
import { icon } from '../icons.js';

export const ROLES = ['Propietario', 'Inquilino', 'Garante', 'Contacto'];

export function vista({ d, params }) {
  const q = (params.get('q') || '').toLowerCase();
  const lista = d.personas
    .filter((p) => !q || [nombreCompleto(p), p.dni, p.telefono, (p.roles || []).join(' ')].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '') || (a.nombre || '').localeCompare(b.nombre || ''));
  const filas = lista.map((p) => `
    <tr class="clickable" data-accion="ver-persona" data-id="${esc(p.id)}">
      <td><div class="cell-title">${esc(p.apellido)}, ${esc(p.nombre)}</div><div class="cell-sub">DNI ${esc(p.dni || '—')}</div></td>
      <td class="chiprow">${(p.roles || []).map((r) => `<span class="badge badge-neutral">${esc(r)}</span>`).join('')}</td>
      <td>${esc(p.telefono || '—')}</td>
      <td>${esc(p.email || '—')}</td>
    </tr>`).join('');
  return `
    <div class="page-head">
      <div><h1 class="page-title">Personas</h1><div class="page-sub">${lista.length} de ${d.personas.length} personas</div></div>
      <button class="btn btn-primary" data-accion="nueva-persona">${icon('plus')}Nueva persona</button>
    </div>
    <div class="search-wrap" style="max-width:340px; margin-bottom:16px;">${lupa}
      <input class="search-input" data-filtro="q" id="filtroPersonas" placeholder="Buscar por nombre, DNI, teléfono o rol..." value="${esc(params.get('q') || '')}"></div>
    <div class="table-wrap">${lista.length
      ? `<table><thead><tr><th>Persona</th><th>Roles</th><th>Teléfono</th><th>Email</th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty-state">${icon('personas')}<div class="empty-state-title">${d.personas.length ? 'No encontramos personas' : 'Todavía no hay personas cargadas'}</div></div>`}</div>`;
}

// Alta o edición. `alGuardar(id)` se llama con el id de la persona guardada.
export function personaModal(d, id, alGuardar, rolInicial) {
  const p = id ? d.personas.find((x) => x.id === id) : { roles: rolInicial ? [rolInicial] : [] };
  const relaciones = id ? relacionesHtml(d, id) : '';
  const box = abrirModal(`
    <div class="section-title" style="margin-bottom:14px;">${id ? esc(nombreCompleto(p)) : 'Nueva persona'}</div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="field"><label for="peNombre">Nombre</label><input id="peNombre" value="${esc(p.nombre || '')}"></div>
      <div class="field"><label for="peApellido">Apellido</label><input id="peApellido" value="${esc(p.apellido || '')}"></div>
      <div class="field"><label for="peDni">DNI</label><input id="peDni" value="${esc(p.dni || '')}" placeholder="Ej: 30.123.456"></div>
      <div class="field"><label for="peCuit">CUIT / CUIL</label><input id="peCuit" value="${esc(p.cuit || '')}" placeholder="Opcional"></div>
      <div class="field"><label for="peTel">Teléfono / WhatsApp</label><input id="peTel" value="${esc(p.telefono || '')}" placeholder="Ej: 11 2233-4455"></div>
      <div class="field"><label for="peEmail">Email</label><input id="peEmail" value="${esc(p.email || '')}" placeholder="Opcional"></div>
      <div class="field" style="grid-column:1/-1;"><label for="peDom">Domicilio</label><input id="peDom" value="${esc(p.domicilio || '')}" placeholder="Opcional"></div>
    </div>
    <div class="field" style="margin-bottom:6px;"><label>Roles (puede tener más de uno)</label></div>
    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:6px;">
      ${ROLES.map((r) => `<label style="display:flex; gap:7px; align-items:center; font-weight:600;"><input type="checkbox" class="peRol" value="${r}" ${(p.roles || []).includes(r) ? 'checked' : ''}> ${r}</label>`).join('')}
    </div>
    ${relaciones}
    ${id && soyAdmin() ? `<div style="margin-top:14px;"><button class="btn btn-ghost btn-danger btn-sm" type="button" data-accion="borrar-persona" data-id="${esc(id)}">Borrar persona</button></div>` : ''}
    ${botonesModal(id ? 'Guardar cambios' : 'Guardar persona', 'peGuardar')}`, true);
  box.querySelector('#peGuardar').onclick = async () => {
    const datosP = {
      nombre: campo('peNombre'), apellido: campo('peApellido'), dni: campo('peDni'), cuit: campo('peCuit'),
      telefono: campo('peTel'), email: campo('peEmail'), domicilio: campo('peDom'),
      roles: [...box.querySelectorAll('.peRol:checked')].map((x) => x.value),
    };
    if (!datosP.nombre || !datosP.apellido) { aviso('Completá nombre y apellido'); return; }
    if (!datosP.roles.length) { aviso('Elegí al menos un rol'); return; }
    if (datosP.dni && d.personas.some((x) => x.id !== id && x.dni && x.dni.replace(/\D/g, '') === datosP.dni.replace(/\D/g, ''))) {
      aviso('Ya hay otra persona cargada con ese DNI'); return;
    }
    let nuevoId = id;
    const ok = await intentar(async () => { nuevoId = await guardar('personas', id, datosP); }, id ? 'Persona actualizada' : 'Persona creada');
    if (ok) { cerrarModal(); if (alGuardar) alGuardar(nuevoId); }
  };
}

function relacionesHtml(d, id) {
  const comoDueno = d.propiedades.filter((pr) => pr.ownerId === id);
  const alquila = d.contratos.filter((c) => c.estado === 'Activo' && (c.tenantId === id || c.tenantId2 === id));
  const garantiza = d.contratos.filter((c) => c.estado === 'Activo' && c.guarantorId === id);
  const PR = (pid) => d.propiedades.find((x) => x.id === pid);
  const fila = (pr, extra) => `<div class="task-row"><div class="task-text">${esc(pr.direccion)}<div class="task-sub">${esc(pr.localidad)}${extra ? ' · ' + extra : ''}</div></div><button class="btn btn-sm" data-cerrar data-nav="/propiedades/${esc(pr.id)}">Ver</button></div>`;
  const bloques = [
    comoDueno.length ? `<div class="kv-label" style="margin:12px 0 4px;">Propietario de</div>${comoDueno.map((pr) => fila(pr, contratoVigente(d.contratos, pr.id) ? 'alquilada' : 'disponible')).join('')}` : '',
    alquila.length ? `<div class="kv-label" style="margin:12px 0 4px;">Alquila</div>${alquila.map((c) => fila(PR(c.propertyId), 'contrato N° ' + esc(c.numero || '—'))).join('')}` : '',
    garantiza.length ? `<div class="kv-label" style="margin:12px 0 4px;">Garante de</div>${garantiza.map((c) => fila(PR(c.propertyId), 'contrato N° ' + esc(c.numero || '—'))).join('')}` : '',
  ].join('');
  return bloques ? `<div class="divider"></div>${bloques}` : '';
}

export const acciones = {
  'nueva-persona': ({ d }) => personaModal(d, null),
  'ver-persona': ({ d, ds }) => personaModal(d, ds.id),
  'borrar-persona': ({ d, ds }) => {
    const p = d.personas.find((x) => x.id === ds.id);
    if (!soyAdmin() || !p) return;
    const usos = [
      ...d.propiedades.filter((pr) => pr.ownerId === p.id).map((pr) => 'propietario de ' + pr.direccion),
      ...d.contratos.filter((c) => [c.tenantId, c.tenantId2, c.guarantorId, c.ownerId].includes(p.id)).map((c) => 'figura en el contrato N° ' + (c.numero || '—')),
    ];
    if (usos.length) { aviso(`No se puede borrar: ${[...new Set(usos)].join('; ')}.`); return; }
    confirmar(`¿Borrar a ${nombreCompleto(p)}? Usalo solo si se cargó por error.`, () => {
      const { id, ...copia } = p;
      intentar(() => borrar('personas', p.id), 'Persona borrada', () => intentar(() => guardar('personas', p.id, copia), 'Persona recuperada'));
    });
  },
};
