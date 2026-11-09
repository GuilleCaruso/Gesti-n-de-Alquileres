// Propiedades: lista con filtros, alta/edición y ficha con pestañas (Información, Contrato, Cobros).
import { esc, money } from '../../domain/formato.js';
import { contratoVigente, estadoPropiedad, nombreCompleto } from '../../domain/consultas.js';
import { pendienteActualizacion } from '../../domain/negocio.js';
import { borrar, guardar } from '../../services/datos.js';
import { abrirModal, aviso, botonesModal, campo, cerrarModal, confirmar, hoyIso, intentar, lupa, numero, soyAdmin, tildado } from '../base.js';
import { comboPersona, elegirPersona } from '../campos.js';
import { icon } from '../icons.js';
import { personaModal } from './personas.js';
import { fichaContratoHtml } from './contratos.js';
import { cobrosContratoHtml } from './cobranzas.js';

const TIPOS = ['Casa', 'Departamento', 'Duplex', 'PH', 'Local comercial', 'Galpón', 'Terreno', 'Cochera', 'Otro'];
const ESTADOS_MANUALES = ['Disponible', 'Reservada', 'En mantenimiento', 'Baja'];

export function badgeEstado(estado) {
  const map = { Alquilada: 'ok', Disponible: 'info', Reservada: 'warn', 'En mantenimiento': 'warn', Baja: 'neutral',
    Activo: 'ok', Finalizado: 'neutral', Rescindido: 'danger', Pagado: 'ok', Pendiente: 'warn', Parcial: 'info', Vencido: 'danger' };
  return `<span class="badge badge-${map[estado] || 'neutral'}">${esc(estado)}</span>`;
}

export function vista({ d, params }) {
  const filtro = params.get('filtro') || 'todas';
  const q = (params.get('q') || '').toLowerCase();
  const P = (id) => d.personas.find((x) => x.id === id);
  let lista = d.propiedades.map((pr) => ({ pr, c: contratoVigente(d.contratos, pr.id), estado: estadoPropiedad(pr, d.contratos) }));
  if (filtro === 'alquiladas') lista = lista.filter((x) => x.estado === 'Alquilada');
  if (filtro === 'disponibles') lista = lista.filter((x) => x.estado === 'Disponible');
  if (q) lista = lista.filter(({ pr, c }) => [pr.tipo, pr.direccion, pr.localidad, nombreCompleto(P(pr.ownerId)), c ? nombreCompleto(P(c.tenantId)) : '', c ? c.numero : ''].join(' ').toLowerCase().includes(q));
  lista.sort((a, b) => a.pr.direccion.localeCompare(b.pr.direccion));
  const filas = lista.map(({ pr, c, estado }) => `
    <tr class="clickable" data-nav="/propiedades/${esc(pr.id)}">
      <td><div class="cell-title">${esc(pr.direccion)}</div><div class="cell-sub">${esc(pr.tipo)} · ${esc(pr.localidad)}</div></td>
      <td>${esc(nombreCompleto(P(pr.ownerId)))}</td>
      <td>${c ? esc(nombreCompleto(P(c.tenantId))) : '<span class="cell-sub">—</span>'}</td>
      <td class="num tnum">${c ? money(c.alquilerActual, c.moneda) : '—'}</td>
      <td>${badgeEstado(estado)} ${c && pendienteActualizacion(c, hoyIso()) ? `<span class="badge badge-warn">${icon('alert')}Actualizar</span>` : ''}</td>
    </tr>`).join('');
  const pills = [['todas', 'Todas'], ['alquiladas', 'Alquiladas'], ['disponibles', 'Disponibles']]
    .map(([k, l]) => `<button class="pill ${filtro === k ? 'active' : ''}" data-param="filtro" data-valor="${k}">${l}</button>`).join('');
  return `
    <div class="page-head">
      <div><h1 class="page-title">Propiedades</h1><div class="page-sub">${lista.length} de ${d.propiedades.length} propiedades</div></div>
      <button class="btn btn-primary" data-accion="nueva-propiedad">${icon('plus')}Nueva propiedad</button>
    </div>
    <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">
      <div class="search-wrap" style="max-width:340px;">${lupa}<input class="search-input" data-filtro="q" id="filtroPropiedades" placeholder="Buscar dirección, propietario, inquilino..." value="${esc(params.get('q') || '')}"></div>
      <div class="pill-row">${pills}</div>
    </div>
    <div class="table-wrap">${lista.length
      ? `<table><thead><tr><th>Propiedad</th><th>Propietario</th><th>Inquilino</th><th class="num">Alquiler</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty-state">${icon('propiedades')}<div class="empty-state-title">${d.propiedades.length ? 'No encontramos propiedades' : 'Todavía no hay propiedades cargadas'}</div></div>`}</div>`;
}

export function vistaFicha({ d, id, params }) {
  const pr = d.propiedades.find((x) => x.id === id);
  if (!pr) return `<div class="empty-state">${icon('propiedades')}<div class="empty-state-title">${d.listo ? 'Propiedad no encontrada' : 'Cargando…'}</div></div>`;
  const tab = params.get('tab') || 'info';
  const P = (pid) => d.personas.find((x) => x.id === pid);
  const owner = P(pr.ownerId);
  const c = contratoVigente(d.contratos, pr.id);
  const estado = estadoPropiedad(pr, d.contratos);
  const kv = (l, v) => `<div class="kv"><div class="kv-label">${l}</div><div class="kv-value">${v}</div></div>`;
  let body = '';
  if (tab === 'info') {
    const extras = [pr.cochera && 'Cochera', pr.patio && 'Patio', pr.terraza && 'Terraza', pr.balcon && 'Balcón'].filter(Boolean).join(' · ') || '—';
    body = `<div class="kv-grid">
      ${kv('Dirección', esc(pr.direccion))}${kv('Localidad', esc(pr.localidad))}
      ${kv('Tipo', esc(pr.tipo))}${kv('Superficie', pr.m2 ? pr.m2 + ' m²' : '—')}
      ${kv('Ambientes', `${pr.ambientes || 0} amb · ${pr.dormitorios || 0} dorm · ${pr.banos || 0} baño(s)`)}${kv('Extras', extras)}
      ${kv('Propietario', owner ? `<a data-accion="ver-persona" data-id="${esc(owner.id)}">${esc(nombreCompleto(owner))}</a> · ${esc(owner.telefono || '')}` : '—')}
      ${kv('Inquilino actual', c ? `<a data-accion="ver-persona" data-id="${esc(c.tenantId)}">${esc(nombreCompleto(P(c.tenantId)))}</a>` : '—')}
      ${kv('Cuenta de gas', esc(pr.nroGas || '—'))}${kv('Cuenta de luz', esc(pr.nroLuz || '—'))}
      ${kv('Cuenta de agua', esc(pr.nroAgua || '—'))}${kv('Partida municipal', esc(pr.nroMunicipal || '—'))}
    </div>${pr.obs ? `<div class="divider"></div><div class="kv-label">Observaciones</div><div style="margin-top:4px;">${esc(pr.obs)}</div>` : ''}`;
  } else if (tab === 'contrato') {
    body = c ? fichaContratoHtml(d, c)
      : `<div class="empty-state">${icon('contratos')}<div class="empty-state-title">Sin contrato vigente</div>
         <button class="btn btn-primary" style="margin-top:12px;" data-accion="nuevo-contrato" data-propiedad="${esc(pr.id)}">${icon('plus')}Nuevo contrato para esta propiedad</button></div>`;
  } else if (tab === 'cobros') {
    body = c ? cobrosContratoHtml(d, c) : `<div class="empty-state">${icon('cobranzas')}<div class="empty-state-title">Sin contrato vigente</div></div>`;
  }
  const tabs = [['info', 'Información'], ['contrato', 'Contrato'], ['cobros', 'Cobros y recibos']];
  return `
    <button class="back-link" data-nav="/propiedades">${icon('back')}Volver a propiedades</button>
    <div class="ficha-head">
      <div><div class="ficha-id">PROPIEDAD</div><div class="ficha-title">${esc(pr.tipo)} — ${esc(pr.direccion)}</div>
        <div class="ficha-meta">${esc(pr.localidad)} · ${badgeEstado(estado)}</div></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" data-accion="editar-propiedad" data-id="${esc(pr.id)}">Editar propiedad</button>
        ${soyAdmin() ? `<button class="btn btn-ghost btn-danger" data-accion="borrar-propiedad" data-id="${esc(pr.id)}">Borrar</button>` : ''}
      </div>
    </div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab-btn ${tab === k ? 'active' : ''}" data-param="tab" data-valor="${k}">${l}</button>`).join('')}</div>
    <div>${body}</div>`;
}

export function propiedadModal(d, id, alGuardar) {
  const pr = id ? d.propiedades.find((x) => x.id === id) : { tipo: 'Casa', localidad: 'Paso del Rey', estado: 'Disponible', ambientes: 2, dormitorios: 1, banos: 1 };
  const alquilada = id && contratoVigente(d.contratos, id);
  const box = abrirModal(`
    <div class="section-title" style="margin-bottom:14px;">${id ? 'Editar propiedad' : 'Nueva propiedad'}</div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="field"><label for="prTipo">Tipo</label><select id="prTipo">${TIPOS.map((t) => `<option ${t === pr.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="prEstado">Estado</label>${alquilada ? '<input value="Alquilada (tiene contrato vigente)" disabled>' : `<select id="prEstado">${ESTADOS_MANUALES.map((t) => `<option ${t === pr.estado ? 'selected' : ''}>${t}</option>`).join('')}</select>`}</div>
      <div class="field"><label for="prDir">Dirección</label><input id="prDir" value="${esc(pr.direccion || '')}" placeholder="Ej: Belgrano 1234, 1°B"></div>
      <div class="field"><label for="prLoc">Localidad</label><input id="prLoc" value="${esc(pr.localidad || '')}"></div>
      <div class="field" style="grid-column:1/-1;"><label for="prOwnerBuscar">Propietario</label>
        <div style="display:flex; gap:8px;">${comboPersona('prOwner', d.personas, pr.ownerId)}
        <button class="btn" id="prNuevoOwner" type="button">${icon('plus')}Nuevo</button></div></div>
      <div class="field"><label for="prAmb">Ambientes</label><input type="number" id="prAmb" min="0" value="${pr.ambientes ?? ''}"></div>
      <div class="field"><label for="prDorm">Dormitorios</label><input type="number" id="prDorm" min="0" value="${pr.dormitorios ?? ''}"></div>
      <div class="field"><label for="prBanos">Baños</label><input type="number" id="prBanos" min="0" value="${pr.banos ?? ''}"></div>
      <div class="field"><label for="prM2">Superficie (m²)</label><input type="number" id="prM2" min="0" value="${pr.m2 ?? ''}"></div>
      <div class="field"><label for="prGas">Cuenta de gas</label><input id="prGas" value="${esc(pr.nroGas || '')}" placeholder="Opcional"></div>
      <div class="field"><label for="prLuz">Cuenta de luz</label><input id="prLuz" value="${esc(pr.nroLuz || '')}" placeholder="Opcional"></div>
      <div class="field"><label for="prAgua">Cuenta de agua</label><input id="prAgua" value="${esc(pr.nroAgua || '')}" placeholder="Opcional"></div>
      <div class="field"><label for="prMuni">Partida municipal</label><input id="prMuni" value="${esc(pr.nroMunicipal || '')}" placeholder="Opcional"></div>
    </div>
    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:12px;">
      ${[['prCochera', 'Cochera', pr.cochera], ['prPatio', 'Patio', pr.patio], ['prTerraza', 'Terraza', pr.terraza], ['prBalcon', 'Balcón', pr.balcon]]
        .map(([i, l, v]) => `<label style="display:flex; gap:7px; align-items:center; font-weight:600;"><input type="checkbox" id="${i}" ${v ? 'checked' : ''}> ${l}</label>`).join('')}
    </div>
    <div class="field"><label for="prObs">Observaciones</label><input id="prObs" value="${esc(pr.obs || '')}" placeholder="Opcional"></div>
    ${botonesModal(id ? 'Guardar cambios' : 'Guardar propiedad', 'prGuardar')}`, true);
  // propietario nuevo sin perder lo cargado: se guarda un borrador y se vuelve a abrir
  box.querySelector('#prNuevoOwner').onclick = () => {
    const borrador = leer();
    personaModal(d, null, (nuevoOwner) => { propiedadModal(d, id, alGuardar); setTimeout(() => rellenar({ ...borrador, ownerId: nuevoOwner }), 0); }, 'Propietario');
  };
  function leer() {
    return {
      tipo: campo('prTipo'), direccion: campo('prDir'), localidad: campo('prLoc'), ownerId: campo('prOwner'),
      ambientes: numero('prAmb'), dormitorios: numero('prDorm'), banos: numero('prBanos'), m2: numero('prM2'),
      cochera: tildado('prCochera'), patio: tildado('prPatio'), terraza: tildado('prTerraza'), balcon: tildado('prBalcon'),
      nroGas: campo('prGas'), nroLuz: campo('prLuz'), nroAgua: campo('prAgua'), nroMunicipal: campo('prMuni'), obs: campo('prObs'),
      ...(document.getElementById('prEstado') ? { estado: campo('prEstado') } : {}),
    };
  }
  function rellenar(b) {
    const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
    set('prTipo', b.tipo); set('prDir', b.direccion); set('prLoc', b.localidad); elegirPersona('prOwner', b.ownerId);
    set('prAmb', b.ambientes); set('prDorm', b.dormitorios); set('prBanos', b.banos); set('prM2', b.m2 || '');
    set('prGas', b.nroGas); set('prLuz', b.nroLuz); set('prAgua', b.nroAgua); set('prMuni', b.nroMunicipal); set('prObs', b.obs);
    if (b.estado) set('prEstado', b.estado);
    ['Cochera', 'Patio', 'Terraza', 'Balcon'].forEach((k) => { const el = document.getElementById('pr' + k); if (el) el.checked = !!b[k.toLowerCase()]; });
  }
  box.querySelector('#prGuardar').onclick = async () => {
    const datosPr = leer();
    if (!datosPr.direccion || !datosPr.localidad) { aviso('Completá dirección y localidad'); return; }
    if (!datosPr.ownerId) { aviso('Elegí el propietario (o crealo con "Nuevo")'); return; }
    let nuevoId = id;
    const owner = d.personas.find((p) => p.id === datosPr.ownerId);
    const ok = await intentar(async () => {
      nuevoId = await guardar('propiedades', id, datosPr);
      if (owner && !(owner.roles || []).includes('Propietario')) await guardar('personas', owner.id, { roles: [...(owner.roles || []), 'Propietario'] });
    }, id ? 'Propiedad actualizada' : 'Propiedad creada');
    if (ok) { cerrarModal(); if (alGuardar) alGuardar(nuevoId); else if (!id) location.hash = '#/propiedades/' + nuevoId; }
  };
}

export const acciones = {
  'nueva-propiedad': ({ d }) => propiedadModal(d, null),
  'editar-propiedad': ({ d, ds }) => propiedadModal(d, ds.id),
  'borrar-propiedad': ({ d, ds }) => {
    const pr = d.propiedades.find((x) => x.id === ds.id);
    if (!soyAdmin() || !pr) return;
    const contratos = d.contratos.filter((c) => c.propertyId === pr.id);
    if (contratos.length) {
      aviso(`Esta propiedad tiene ${contratos.length === 1 ? 'un contrato' : contratos.length + ' contratos'} (N° ${contratos.map((c) => c.numero || '—').join(', ')}). Borrá primero el contrato, o pasala a "Baja" desde Editar.`);
      return;
    }
    confirmar(`¿Borrar la propiedad ${pr.direccion}? Usalo solo si se cargó por error.`, async () => {
      const { id, ...copia } = pr;
      const ok = await intentar(() => borrar('propiedades', pr.id), 'Propiedad borrada', () => intentar(() => guardar('propiedades', pr.id, copia), 'Propiedad recuperada'));
      if (ok) location.hash = '#/propiedades';
    });
  },
};

