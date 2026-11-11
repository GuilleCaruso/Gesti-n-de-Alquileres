// Contratos: lista, alta/edición (N° interno, garante, honorarios, expensas, aumentos) y ficha.
import { esc, fdate, money } from '../../domain/formato.js';
import { addMonths, contratosPorVencer, contratoVencido, contratoVigente, diasParaVencer, deshacerUltimoAumento, finPorDefecto, nombreCompleto } from '../../domain/consultas.js';
import { HONORARIOS_DEFAULT, honorariosLabel, pendienteActualizacion } from '../../domain/negocio.js';
import { actualizar, borrar, guardar, tieneCobros } from '../../services/datos.js';
import { abrirModal, aviso, botonesModal, campo, cerrarModal, confirmar, hoyIso, intentar, lupa, numero, soyAdmin, tildado } from '../base.js';
import { comboPersona, fecha, inputFecha, ponerFecha } from '../campos.js';
import { icon } from '../icons.js';
import { personaModal } from './personas.js';
import { badgeEstado } from './propiedades.js';
import { imprimirNotaAumento } from './aumentos.js';

export const TIPOS_AUMENTO = [['ICL', 'ICL'], ['IPC', 'IPC'], ['Fijo', 'Porcentaje fijo'], ['Personalizado', 'Personalizado / acuerdo']];
export const metodoLabel = (c) => (c.tipoAumento === 'Fijo' ? `Porcentaje fijo (${c.pctFijo}%)` : c.tipoAumento === 'Personalizado' ? 'Personalizado' : c.tipoAumento);

export function vista({ d, params }) {
  const filtro = params.get('filtro') || 'activos';
  const q = (params.get('q') || '').toLowerCase();
  const hoy = hoyIso();
  const P = (id) => d.personas.find((x) => x.id === id);
  const PR = (id) => d.propiedades.find((x) => x.id === id) || { direccion: '—', localidad: '' };
  let lista = d.contratos.slice();
  if (filtro === 'activos') lista = lista.filter((c) => c.estado === 'Activo');
  if (filtro === 'pendiente') lista = lista.filter((c) => c.estado === 'Activo' && pendienteActualizacion(c, hoy));
  if (filtro === 'finalizados') lista = lista.filter((c) => c.estado !== 'Activo');
  const porVencer = contratosPorVencer(d.contratos, hoy);
  if (filtro === 'porvencer') lista = porVencer.slice();
  if (filtro === 'revisar') lista = lista.filter((c) => c.estado === 'Activo' && c.revisarAumento);
  const aRevisar = d.contratos.filter((c) => c.estado === 'Activo' && c.revisarAumento).length;
  if (q) lista = lista.filter((c) => [c.numero, PR(c.propertyId).direccion, PR(c.propertyId).localidad, nombreCompleto(P(c.tenantId)), nombreCompleto(P(c.ownerId))].join(' ').toLowerCase().includes(q));
  if (filtro === 'porvencer') lista.sort((a, b) => a.fin.localeCompare(b.fin));
  else lista.sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), undefined, { numeric: true }));
  const filas = lista.map((c) => `
    <tr class="clickable" data-nav="/propiedades/${esc(c.propertyId)}?tab=contrato">
      <td class="cell-title tnum">${esc(c.numero || '—')}</td>
      <td><div class="cell-title">${esc(PR(c.propertyId).direccion)}</div><div class="cell-sub">${esc(PR(c.propertyId).localidad)}</div></td>
      <td>${esc(nombreCompleto(P(c.tenantId)))}</td>
      <td class="num tnum">${money(c.alquilerActual, c.moneda)}</td>
      <td class="tnum">${fdate(c.fin)}${c.estado === 'Activo' && c.fin && diasParaVencer(c, hoy) <= 60 ? `<div>${contratoVencido(c, hoy) ? '<span class="badge badge-danger">Vencido</span>' : `<span class="badge badge-warn">Vence en ${diasParaVencer(c, hoy)} días</span>`}</div>` : ''}</td>
      <td>${c.estado === 'Activo' && c.revisarAumento ? `<span class="badge badge-info">Revisar aumento</span> ` : ''}${c.estado !== 'Activo' ? badgeEstado(c.estado) : pendienteActualizacion(c, hoy) ? `<span class="badge badge-warn">${icon('alert')}Actualizar</span>` : `<span class="cell-sub">Próx. ${fdate(c.proxAct)}</span>`}</td>
    </tr>`).join('');
  const pills = [['activos', 'Activos'], ['pendiente', 'Actualización pendiente'], ...(porVencer.length ? [['porvencer', `Vencidos y por vencer (${porVencer.length})`]] : []), ...(aRevisar ? [['revisar', `Revisar aumento (${aRevisar})`]] : []), ['finalizados', 'Finalizados']]
    .map(([k, l]) => `<button class="pill ${filtro === k ? 'active' : ''}" data-param="filtro" data-valor="${k}">${l}</button>`).join('');
  return `
    <div class="page-head">
      <div><h1 class="page-title">Contratos</h1><div class="page-sub">${lista.length} contratos</div></div>
      <button class="btn btn-primary" data-accion="nuevo-contrato">${icon('plus')}Nuevo contrato</button>
    </div>
    <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">
      <div class="search-wrap" style="max-width:340px;">${lupa}<input class="search-input" data-filtro="q" id="filtroContratos" placeholder="Buscar N°, propiedad, inquilino, propietario..." value="${esc(params.get('q') || '')}"></div>
      <div class="pill-row">${pills}</div>
    </div>
    <div class="table-wrap">${lista.length
      ? `<table><thead><tr><th>N°</th><th>Propiedad</th><th>Inquilino</th><th class="num">Alquiler</th><th>Vence</th><th>Actualización</th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty-state">${icon('contratos')}<div class="empty-state-title">${d.contratos.length ? 'No hay contratos en este filtro' : 'Todavía no hay contratos cargados'}</div></div>`}</div>`;
}

export function fichaContratoHtml(d, c) {
  const P = (id) => d.personas.find((x) => x.id === id);
  const persona = (id) => (id && P(id) ? `<a data-accion="ver-persona" data-id="${esc(id)}">${esc(nombreCompleto(P(id)))}</a>` : '—');
  const kv = (l, v) => `<div class="kv"><div class="kv-label">${l}</div><div class="kv-value">${v}</div></div>`;
  const hist = [...(c.historial || [])].reverse();
  return `
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
      <button class="btn" data-accion="editar-contrato" data-id="${esc(c.id)}">Editar contrato</button>
      <button class="btn btn-ghost" data-accion="finalizar-contrato" data-id="${esc(c.id)}">Finalizar contrato</button>
      ${soyAdmin() ? `<button class="btn btn-ghost btn-danger" data-accion="borrar-contrato" data-id="${esc(c.id)}">Borrar contrato</button>` : ''}
    </div>
    ${contratoVencido(c, hoyIso()) ? `<div class="note-banner" style="margin-bottom:14px;">${icon('alert')}<div><b>Contrato vencido el ${fdate(c.fin)}.</b> Se sigue cobrando hasta que lo resuelvas. Si se renovó, cargá la nueva fecha de fin con <b>Editar contrato</b>; si el inquilino se fue, tocá <b>Finalizar contrato</b>.</div></div>`
      : c.estado === 'Activo' && c.fin && diasParaVencer(c, hoyIso()) <= 60 ? `<div class="note-banner info" style="margin-bottom:14px;">${icon('alert')}<div><b>Vence en ${diasParaVencer(c, hoyIso())} días</b> (${fdate(c.fin)}). Si se renueva, cargá la nueva fecha de fin con <b>Editar contrato</b>.</div></div>` : ''}
    ${c.revisarAumento && c.estado === 'Activo' ? `<div class="note-banner info" style="margin-bottom:14px;">${icon('alert')}<div><b>Revisar aumento:</b> este contrato vino de Arcomercial sin "cada cuántos meses" o sin la fecha del próximo aumento. Confirmá la frecuencia y la próxima actualización con <b>Editar contrato</b> y guardá.</div></div>` : ''}
    <div class="kv-grid">
      ${kv('N° de contrato', esc(c.numero || '—'))}${kv('Estado', badgeEstado(c.estado))}
      ${kv('Inquilino', persona(c.tenantId))}${kv('Inquilino 2', persona(c.tenantId2))}
      ${kv('Garante', persona(c.guarantorId))}${kv('Propietario', persona(c.ownerId))}
      ${kv('Inicio', fdate(c.inicio))}${kv('Fin', fdate(c.fin))}
      ${kv('Alquiler actual', money(c.alquilerActual, c.moneda) + (c.moneda === 'USD' ? ' <span class="badge badge-info">Dólares</span>' : ''))}${kv('Depósito', c.deposito ? money(c.deposito, c.moneda) : '—')}
      ${kv('Actualización', `${esc(metodoLabel(c))} · cada ${c.frecuencia} meses`)}
      ${kv('Próxima actualización', fdate(c.proxAct) + (pendienteActualizacion(c, hoyIso()) ? ` <span class="badge badge-warn">${icon('alert')}Pendiente</span>` : ''))}
      ${kv('Expensas', c.expensas && c.expensas.aplica ? money(c.expensas.monto || 0, c.moneda) : 'No')}${kv('Honorarios', esc(honorariosLabel(c.honorarios)))}
      ${kv('Vence cada mes el día', esc(c.diaVencimiento || 10))}
    </div>
    ${c.obs ? `<div class="divider"></div><div class="kv-label">Observaciones</div><div style="margin-top:4px;">${esc(c.obs)}</div>` : ''}
    <div class="divider"></div>
    <div class="kv-label" style="margin-bottom:8px;">Historial de aumentos</div>
    ${hist.length ? `<div class="table-wrap"><table><thead><tr><th>Rige desde</th><th class="num">Anterior</th><th class="num">Nuevo</th><th>Índice</th><th></th></tr></thead><tbody>
      ${hist.map((h, i) => `<tr><td class="tnum">${fdate(h.fecha)}</td><td class="num tnum">${money(h.anterior, c.moneda)}</td><td class="num tnum">${money(h.nuevo, c.moneda)}</td><td>${esc(h.indice)}</td>
        <td class="row-actions"><button class="btn btn-sm" data-accion="nota-historial" data-id="${esc(c.id)}" data-i="${hist.length - 1 - i}">${icon('printer')}Nota</button>${i === 0 ? `<button class="btn btn-sm btn-ghost btn-danger" data-accion="deshacer-aumento" data-id="${esc(c.id)}">Deshacer</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="page-sub">Todavía no hay aumentos registrados en este contrato.</div>'}`;
}

// Alta (sin id) o edición. `propiedadId` precarga la propiedad.
export function contratoModal(d, id, propiedadId, borrador) {
  const c = id ? d.contratos.find((x) => x.id === id)
    : { propertyId: propiedadId || '', inicio: hoyIso(), fin: finPorDefecto(hoyIso()), tipoAumento: 'ICL', frecuencia: 3, diaVencimiento: 10, honorarios: HONORARIOS_DEFAULT, expensas: { aplica: false } };
  const v = { ...c, ...(borrador || {}) };
  const disponibles = d.propiedades.filter((pr) => pr.estado !== 'Baja' && (!contratoVigente(d.contratos, pr.id) || pr.id === c.propertyId))
    .sort((a, b) => a.direccion.localeCompare(b.direccion));
  const selPersona = (idSel, valor, rol) => `<div style="display:flex; gap:8px;">${comboPersona(idSel, d.personas, valor)}<button class="btn" type="button" data-nueva-persona="${idSel}" data-rol="${rol}">${icon('plus')}Nueva</button></div>`;
  const h = v.honorarios || HONORARIOS_DEFAULT;
  const box = abrirModal(`
    <div class="section-title" style="margin-bottom:4px;">${id ? 'Editar contrato N° ' + esc(c.numero || '') : 'Nuevo contrato'}</div>
    <div class="page-sub" style="margin-bottom:14px;">${id ? 'El alquiler se puede corregir acá si se cargó mal. Un aumento se aplica desde Aumentos, para que quede en el historial.' : 'Para un contrato que ya viene corriendo, cargá el alquiler actual y la fecha de la próxima actualización.'}</div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="field" style="grid-column:1/-1;"><label for="ctProp">Propiedad</label><select id="ctProp" ${id ? 'disabled' : ''}><option value="">Elegir…</option>${disponibles.map((pr) => `<option value="${esc(pr.id)}" ${pr.id === v.propertyId ? 'selected' : ''}>${esc(pr.direccion)} — ${esc(pr.localidad)}</option>`).join('')}</select></div>
      <div class="field"><label>Propietario</label><input id="ctOwner" disabled></div>
      <div class="field"><label for="ctNumero">N° de contrato</label><input id="ctNumero" value="${esc(v.numero || '')}" placeholder="Número interno"></div>
      <div class="field"><label for="ctTenantBuscar">Inquilino</label>${selPersona('ctTenant', v.tenantId, 'Inquilino')}</div>
      <div class="field"><label for="ctTenant2Buscar">Inquilino 2 (opcional)</label>${selPersona('ctTenant2', v.tenantId2, 'Inquilino')}</div>
      <div class="field"><label for="ctGaranteBuscar">Garante (opcional)</label>${selPersona('ctGarante', v.guarantorId, 'Garante')}</div>
      <div class="field"><label for="ctDia">Vence cada mes el día</label><input type="number" id="ctDia" min="1" max="28" value="${v.diaVencimiento || 10}"></div>
    </div>
    <div class="divider"></div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="field"><label for="ctInicio">Fecha de inicio</label>${inputFecha('ctInicio', v.inicio)}</div>
      <div class="field"><label for="ctFin">Fecha de fin</label>${inputFecha('ctFin', v.fin)}<span class="cell-sub">Vacío = 2 años desde el inicio</span></div>
      <div class="field"><label for="ctMoneda">Moneda</label><select id="ctMoneda"><option value="ARS" ${v.moneda !== 'USD' ? 'selected' : ''}>Pesos ($)</option><option value="USD" ${v.moneda === 'USD' ? 'selected' : ''}>Dólares (US$)</option></select></div>
      <div class="field"><label for="ctAlquiler">Alquiler actual</label><input type="number" id="ctAlquiler" min="0" step="any" value="${v.alquilerActual ?? ''}"></div>
      <div class="field"><label for="ctDeposito">Depósito</label><input type="number" id="ctDeposito" min="0" step="500" value="${v.deposito ?? ''}" placeholder="Opcional"></div>
      <div class="field"><label for="ctTipo">Tipo de aumento</label><select id="ctTipo">${TIPOS_AUMENTO.map(([k, l]) => `<option value="${k}" ${k === v.tipoAumento ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="ctPct">% fijo (solo si aplica)</label><input type="number" id="ctPct" min="0" step="0.5" value="${v.pctFijo ?? ''}"></div>
      <div class="field"><label for="ctFrec">Cada cuántos meses</label><select id="ctFrec">${[3, 4, 6, 12].map((n) => `<option value="${n}" ${n === Number(v.frecuencia) ? 'selected' : ''}>Cada ${n} meses</option>`).join('')}</select></div>
      <div class="field"><label for="ctProx">Próxima actualización</label>${inputFecha('ctProx', v.proxAct)}<span class="cell-sub">Vacío = inicio + frecuencia</span></div>
    </div>
    <div class="divider"></div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="field"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="ctExpAplica" ${v.expensas && v.expensas.aplica ? 'checked' : ''}> Paga expensas</label><input type="number" id="ctExpMonto" min="0" step="100" value="${(v.expensas && v.expensas.monto) || ''}" placeholder="Monto de expensas"></div>
      <div class="field"><label for="ctHonTipo">Honorarios</label><div style="display:flex; gap:8px;"><select id="ctHonTipo"><option value="porcentaje" ${h.tipo === 'porcentaje' ? 'selected' : ''}>Porcentaje</option><option value="fijo" ${h.tipo === 'fijo' ? 'selected' : ''}>Monto fijo</option></select><input type="number" id="ctHonValor" min="0" step="0.5" value="${h.valor}" style="flex:1;"></div></div>
      <div class="field" style="grid-column:1/-1;"><label for="ctObs">Observaciones</label><input id="ctObs" value="${esc(v.obs || '')}" placeholder="Opcional"></div>
    </div>
    ${botonesModal(id ? 'Guardar cambios' : 'Crear contrato', 'ctGuardar')}`, true);

  const propSel = box.querySelector('#ctProp');
  const pintarOwner = () => {
    const pr = d.propiedades.find((x) => x.id === propSel.value);
    const o = pr && d.personas.find((x) => x.id === pr.ownerId);
    box.querySelector('#ctOwner').value = o ? nombreCompleto(o) : '';
  };
  propSel.addEventListener('change', pintarOwner);
  pintarOwner();

  // fin a 2 años: se completa solo mientras no lo toquen a mano
  const finEl = box.querySelector('#ctFin');
  let finAuto = !id && (!v.fin || v.fin === finPorDefecto(v.inicio || ''));
  finEl.addEventListener('input', () => { finAuto = !finEl.value.trim(); });
  const alCambiarInicio = () => { const ini = fecha('ctInicio'); if (finAuto && ini) ponerFecha('ctFin', finPorDefecto(ini)); };
  box.querySelector('#ctInicio').addEventListener('input', alCambiarInicio);
  box.querySelector('#ctInicio').addEventListener('change', alCambiarInicio);

  const leer = () => ({
    propertyId: campo('ctProp'), numero: campo('ctNumero'), tenantId: campo('ctTenant'), tenantId2: campo('ctTenant2') || null,
    guarantorId: campo('ctGarante') || null, diaVencimiento: Math.min(28, Math.max(1, numero('ctDia') || 10)),
    inicio: fecha('ctInicio'), fin: fecha('ctFin'), alquilerActual: numero('ctAlquiler'), deposito: numero('ctDeposito') || null,
    tipoAumento: campo('ctTipo'), pctFijo: numero('ctPct') || null, frecuencia: Number(campo('ctFrec')), proxAct: fecha('ctProx'),
    expensas: { aplica: tildado('ctExpAplica'), monto: numero('ctExpMonto') }, honorarios: { tipo: campo('ctHonTipo'), valor: numero('ctHonValor') },
    obs: campo('ctObs'), revisarAumento: false, moneda: campo('ctMoneda') || 'ARS',
  });

  // persona nueva sin perder lo cargado
  box.querySelectorAll('[data-nueva-persona]').forEach((b) => {
    b.onclick = () => {
      const borr = leer();
      const destino = b.dataset.nuevaPersona;
      personaModal(d, null, (nueva) => {
        const clave = { ctTenant: 'tenantId', ctTenant2: 'tenantId2', ctGarante: 'guarantorId' }[destino];
        setTimeout(() => contratoModal(d, id, propiedadId, { ...borr, [clave]: nueva }), 300);
      }, b.dataset.rol);
    };
  });

  box.querySelector('#ctGuardar').onclick = async () => {
    const x = leer();
    if (!id) x.propertyId = campo('ctProp');
    else x.propertyId = c.propertyId;
    const pr = d.propiedades.find((p) => p.id === x.propertyId);
    if (!pr) { aviso('Elegí la propiedad'); return; }
    if (!x.tenantId) { aviso('Elegí el inquilino (o crealo con "Nueva")'); return; }
    if ([x.inicio, x.fin, x.proxAct].includes(null)) { aviso('Hay una fecha mal escrita: usá dd/mm/aaaa (ej: 01/09/2025)'); return; }
    if (x.inicio && !x.fin) x.fin = finPorDefecto(x.inicio);
    if (!x.inicio || !x.fin || x.fin <= x.inicio) { aviso('Revisá las fechas de inicio y fin'); return; }
    if (x.alquilerActual <= 0) { aviso('Cargá el alquiler actual'); return; }
    if (x.tipoAumento === 'Fijo' && !x.pctFijo) { aviso('Cargá el % fijo de aumento'); return; }
    if (x.numero && d.contratos.some((o) => o.id !== id && o.numero === x.numero)) { aviso('Ya existe otro contrato con el N° ' + x.numero); return; }
    if (!(x.honorarios.valor >= 0)) { aviso('Revisá los honorarios'); return; }
    if (!x.proxAct) x.proxAct = addMonths(x.inicio, x.frecuencia);
    x.ownerId = pr.ownerId;
    // en una edición el monto solo se corrige (un aumento se carga desde Aumentos, para que quede en el historial)
    if (id && x.alquilerActual === c.alquilerActual) delete x.alquilerActual;
    const datosC = id ? x : { ...x, alquilerInicial: x.alquilerActual, historial: [], estado: 'Activo' };
    let nuevoId = id;
    const ok = await intentar(async () => {
      nuevoId = await guardar('contratos', id, datosC);
      // el inquilino y el garante quedan con su rol en Personas
      for (const [pid, rol] of [[x.tenantId, 'Inquilino'], [x.tenantId2, 'Inquilino'], [x.guarantorId, 'Garante']]) {
        const p = pid && d.personas.find((y) => y.id === pid);
        if (p && !(p.roles || []).includes(rol)) await guardar('personas', pid, { roles: [...(p.roles || []), rol] });
      }
    }, id ? 'Contrato actualizado' : 'Contrato creado');
    if (ok) { cerrarModal(); if (!id) location.hash = `#/propiedades/${x.propertyId}?tab=contrato`; }
  };
}

export const acciones = {
  'nuevo-contrato': ({ d, ds }) => contratoModal(d, null, ds.propiedad),
  'editar-contrato': ({ d, ds }) => contratoModal(d, ds.id),
  'finalizar-contrato': ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    confirmar(`¿Finalizar el contrato N° ${c.numero || ''}? La propiedad queda disponible. El contrato y sus cobros quedan en el historial.`, () =>
      intentar(() => actualizar('contratos', c.id, { estado: 'Finalizado', finalizadoEl: hoyIso() }), 'Contrato finalizado',
        () => intentar(() => actualizar('contratos', c.id, { estado: 'Activo' }), 'Contrato reactivado')));
  },
  'borrar-contrato': async ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    if (!soyAdmin()) return;
    let conCobros = true;
    if (!(await intentar(async () => { conCobros = await tieneCobros(c.id); }))) return;
    if (conCobros) { aviso('Este contrato tiene cobros registrados: no se puede borrar. Usá "Finalizar contrato".'); return; }
    const pr = d.propiedades.find((x) => x.id === c.propertyId);
    confirmar(`¿Borrar el contrato N° ${c.numero || ''}${pr ? ' de ' + pr.direccion : ''}? Usalo solo si se cargó por error.`, async () => {
      const { id, ...copia } = c;
      const ok = await intentar(() => borrar('contratos', c.id), 'Contrato borrado', () => intentar(() => guardar('contratos', c.id, copia), 'Contrato recuperado'));
      if (ok && pr) location.hash = `#/propiedades/${pr.id}`;
    });
  },
  'deshacer-aumento': ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    const cambios = deshacerUltimoAumento(c);
    if (!cambios) return;
    const ultimo = c.historial[c.historial.length - 1];
    confirmar(`¿Deshacer el aumento del ${fdate(ultimo.fecha)} (${money(ultimo.anterior, c.moneda)} → ${money(ultimo.nuevo, c.moneda)})? El alquiler vuelve a ${money(ultimo.anterior, c.moneda)} y el contrato queda otra vez para actualizar desde el ${fdate(ultimo.fecha)}.`, () => {
      const prev = { alquilerActual: c.alquilerActual, proxAct: c.proxAct, historial: c.historial };
      intentar(() => actualizar('contratos', c.id, cambios), 'Aumento deshecho', () => intentar(() => actualizar('contratos', c.id, prev), 'Aumento restaurado'));
    });
  },
  'nota-historial': ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    imprimirNotaAumento(d, c, c.historial[Number(ds.i)]);
  },
};
