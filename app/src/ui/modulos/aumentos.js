// Aumentos: índices del mes, contratos por vencimiento, actualizar (con historial y deshacer),
// aviso por WhatsApp y nota impresa para el inquilino.
import { esc, fdate, money } from '../../domain/formato.js';
import { contratosActivos, datosAumento, nombreCompleto } from '../../domain/consultas.js';
import { computeNuevo, faltaIndice, pendienteActualizacion } from '../../domain/negocio.js';
import { actualizar, guardarIndices } from '../../services/datos.js';
import { aviso, confirmar, docFoot, docHead, hoyIso, imprimir, intentar, linkWhatsApp } from '../base.js';
import { icon } from '../icons.js';
import { metodoLabel } from './contratos.js';

const diasHasta = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(hoyIso() + 'T00:00:00')) / 86400000);

export function indiceLabel(c, indices, nuevo) {
  if (c.tipoAumento === 'Personalizado') return 'Acuerdo entre partes';
  const auto = computeNuevo(c, indices);
  if (nuevo !== auto) return 'Ajuste manual';
  return `${c.tipoAumento === 'Fijo' ? 'Porcentaje fijo' : c.tipoAumento} ${c.tipoAumento === 'Fijo' ? c.pctFijo : indices[c.tipoAumento]}%`;
}

export function vista({ d, params }) {
  const ver = params.get('ver') || 'proximos';
  const hoy = hoyIso();
  const P = (id) => d.personas.find((x) => x.id === id);
  const PR = (id) => d.propiedades.find((x) => x.id === id) || { direccion: '—' };
  let lista = contratosActivos(d.contratos).sort((a, b) => a.proxAct.localeCompare(b.proxAct));
  if (ver === 'proximos') lista = lista.filter((c) => diasHasta(c.proxAct) <= 45);
  const pendientes = contratosActivos(d.contratos).filter((c) => pendienteActualizacion(c, hoy));
  const filas = lista.map((c) => {
    const t = P(c.tenantId);
    const dias = diasHasta(c.proxAct);
    const sugerido = computeNuevo(c, d.indices);
    const sinIndice = faltaIndice(c, d.indices);
    const estado = dias <= 0 ? `<span class="badge badge-warn">${icon('alert')}Pendiente</span>` : dias <= 14 ? `<span class="badge badge-info">En ${dias} día${dias > 1 ? 's' : ''}</span>` : '';
    return `<tr>
      <td><div class="cell-title">${esc(PR(c.propertyId).direccion)}</div><div class="cell-sub">N° ${esc(c.numero || '—')} · ${esc(nombreCompleto(t))}</div></td>
      <td>${esc(metodoLabel(c))}<div class="cell-sub">cada ${c.frecuencia} meses${c.revisarAumento ? ' · <span class="badge badge-info">Revisar</span>' : ''}</div></td>
      <td class="num tnum">${money(c.alquilerActual, c.moneda)}</td>
      <td class="num">${c.moneda === 'USD' ? '<span class="cell-sub">US$</span> ' : ''}<input type="number" step="${c.moneda === 'USD' ? 10 : 1000}" id="nuevo_${esc(c.id)}" value="${sinIndice ? '' : sugerido}" placeholder="${sinIndice ? 'Falta ' + c.tipoAumento : ''}" style="width:118px; padding:6px 8px; border:1px solid var(--border-strong); border-radius:7px; background:var(--paper-50); color:var(--ink-900); text-align:right;"></td>
      <td class="tnum">${fdate(c.proxAct)} ${estado}</td>
      <td class="row-actions">
        <button class="btn btn-sm" data-accion="whatsapp-aumento" data-id="${esc(c.id)}" title="Avisar por WhatsApp">${icon('phone')}WhatsApp</button>
        <button class="btn btn-sm" data-accion="nota-aumento" data-id="${esc(c.id)}" title="Imprimir nota para el inquilino">${icon('printer')}Nota</button>
        <button class="btn btn-sm btn-primary" data-accion="aplicar-aumento" data-id="${esc(c.id)}">Actualizar</button>
      </td>
    </tr>`;
  }).join('');
  const pills = [['proximos', 'Pendientes y próximos 45 días'], ['todos', 'Todos los contratos']]
    .map(([k, l]) => `<button class="pill ${ver === k ? 'active' : ''}" data-param="ver" data-valor="${k}">${l}</button>`).join('');
  return `
    <div class="page-head"><div><h1 class="page-title">Aumentos</h1><div class="page-sub">${pendientes.length} contrato(s) con la actualización vencida</div></div></div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:6px;">Índices del mes</div>
      <div class="page-sub" style="margin-bottom:12px;">Cargá el % del ICL y del IPC del período que corresponde. El "alquiler nuevo" se calcula solo (redondeado a $1.000; en dólares, a US$ 10) y siempre se puede corregir a mano antes de actualizar.</div>
      <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;">
        <div class="field"><label for="idxIcl">ICL (%)</label><input type="number" step="0.01" id="idxIcl" value="${d.indices.ICL ?? 0}"></div>
        <div class="field"><label for="idxIpc">IPC (%)</label><input type="number" step="0.01" id="idxIpc" value="${d.indices.IPC ?? 0}"></div>
        <button class="btn btn-primary" data-accion="guardar-indices">Guardar índices</button>
        <button class="btn" data-accion="actualizar-pendientes" ${pendientes.length ? '' : 'disabled'}>${icon('bolt')}Actualizar todos los pendientes</button>
        <button class="btn" data-accion="notas-pendientes" ${pendientes.length ? '' : 'disabled'}>${icon('printer')}Notas de los pendientes</button>
      </div>
    </div>
    <div class="pill-row" style="margin-bottom:12px;">${pills}</div>
    <div class="table-wrap">${lista.length
      ? `<table><thead><tr><th>Contrato</th><th>Índice</th><th class="num">Alquiler actual</th><th class="num">Alquiler nuevo</th><th>Rige desde</th><th></th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty-state">${icon('check')}<div class="empty-state-title">No hay actualizaciones en los próximos 45 días</div></div>`}</div>`;
}

// Lo que está escrito en la fila (sugerido o corregido a mano). 0 = vacío.
const valorNuevo = (c) => {
  const el = document.getElementById('nuevo_' + c.id);
  return Math.round(el ? parseFloat(el.value) || 0 : 0);
};
// después de actualizar, el monto escrito a mano no tiene que quedar pegado en la fila
const olvidarEdicion = (c) => { const el = document.getElementById('nuevo_' + c.id); if (el) el.defaultValue = el.value; };

function mensajeWhatsApp(d, c, nuevo, fecha) {
  const t = d.personas.find((x) => x.id === c.tenantId) || {};
  const pr = d.propiedades.find((x) => x.id === c.propertyId) || {};
  return `Hola ${t.nombre || ''}! Te escribimos de Caruso Propiedades para avisarte que, según tu contrato, a partir del ${fdate(fecha)} el alquiler de ${pr.direccion} pasa a ser de ${money(nuevo, c.moneda)}. Cualquier consulta, quedamos a disposición.`;
}

// Nota impresa: `h` = {fecha, anterior, nuevo, indice}
export function notaAumentoHtml(d, c, h) {
  const P = (id) => d.personas.find((x) => x.id === id) || {};
  const pr = d.propiedades.find((x) => x.id === c.propertyId) || {};
  const inquilinos = [P(c.tenantId), c.tenantId2 ? P(c.tenantId2) : null].filter(Boolean).map(nombreCompleto).join(' y ');
  return docHead('Notificación de actualización de alquiler', `Contrato N° ${esc(c.numero || '—')}`) + `
    <p style="text-align:right;">Paso del Rey, ${fdate(hoyIso())}</p>
    <p>Sr./Sra. <b>${esc(inquilinos)}</b><br>Inmueble: ${esc(pr.direccion)}, ${esc(pr.localidad)}</p>
    <p>Por medio de la presente le notificamos que, conforme a lo pactado en el contrato de locación N° ${esc(c.numero || '—')},
    el alquiler del inmueble se actualiza a partir del <b>${fdate(h.fecha)}</b> (${esc(h.indice)}).</p>
    <table style="margin:14px 0;"><thead><tr><th>Alquiler anterior</th><th>Nuevo alquiler</th><th>Rige desde</th></tr></thead>
      <tbody><tr><td class="num">${money(h.anterior, c.moneda)}</td><td class="num"><b>${money(h.nuevo, c.moneda)}</b></td><td>${fdate(h.fecha)}</td></tr></tbody></table>
    <p>Quedamos a disposición por cualquier consulta. Saludos cordiales.</p>
    <div class="doc-sign"><div>Caruso Propiedades</div><div>Recibí copia — firma y aclaración del inquilino</div></div>
    ${docFoot()}`;
}
export const imprimirNotaAumento = (d, c, h) => imprimir([notaAumentoHtml(d, c, h)]);

function aplicar(d, c, nuevo) {
  const prev = { alquilerActual: c.alquilerActual, proxAct: c.proxAct, historial: c.historial || [], revisarAumento: !!c.revisarAumento };
  const cambios = { ...datosAumento(c, nuevo, indiceLabel(c, d.indices, nuevo), hoyIso()), revisarAumento: false };
  return { prev, cambios };
}

export const acciones = {
  'guardar-indices': () => {
    const icl = parseFloat(document.getElementById('idxIcl').value) || 0;
    const ipc = parseFloat(document.getElementById('idxIpc').value) || 0;
    intentar(() => guardarIndices(icl, ipc), 'Índices guardados');
  },
  'aplicar-aumento': ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    const nuevo = valorNuevo(c);
    if (nuevo <= 0) {
      aviso(faltaIndice(c, d.indices) ? `Falta cargar el ${c.tipoAumento} del mes (arriba, en "Índices del mes") o escribir el alquiler nuevo a mano.` : 'Escribí el alquiler nuevo');
      return;
    }
    const igual = nuevo <= c.alquilerActual
      ? ` Ojo: el alquiler nuevo no es mayor al actual.` : '';
    confirmar(`¿Actualizar el contrato N° ${c.numero || ''} de ${money(c.alquilerActual, c.moneda)} a ${money(nuevo, c.moneda)} desde el ${fdate(c.proxAct)}?${igual}`, () => {
      const { prev, cambios } = aplicar(d, c, nuevo);
      olvidarEdicion(c);
      intentar(() => actualizar('contratos', c.id, cambios), `N° ${c.numero || ''}: nuevo alquiler ${money(nuevo, c.moneda)} desde ${fdate(c.proxAct)}`,
        () => intentar(() => actualizar('contratos', c.id, prev), 'Aumento deshecho'));
    });
  },
  'actualizar-pendientes': ({ d }) => {
    const pend = contratosActivos(d.contratos).filter((c) => pendienteActualizacion(c, hoyIso()) && c.tipoAumento !== 'Personalizado');
    const due = pend.filter((c) => !faltaIndice(c, d.indices));
    const sinIndice = [...new Set(pend.filter((c) => faltaIndice(c, d.indices)).map((c) => c.tipoAumento))];
    if (!due.length) { aviso(sinIndice.length ? `Falta cargar el ${sinIndice.join(' y el ')} del mes.` : 'No hay pendientes automáticos (los "Personalizado" se actualizan uno por uno)'); return; }
    confirmar(`¿Actualizar ${due.length} contrato(s) pendiente(s) con los índices cargados? Los "Personalizado"${sinIndice.length ? ' y los que usan ' + sinIndice.join('/') + ' (falta el índice)' : ''} no se tocan. Se puede deshacer desde la ficha de cada contrato.`, () => {
      const lotes = due.map((c) => ({ c, ...aplicar(d, c, computeNuevo(c, d.indices)) }));
      due.forEach(olvidarEdicion);
      intentar(() => Promise.all(lotes.map(({ c, cambios }) => actualizar('contratos', c.id, cambios))), `${due.length} contrato(s) actualizado(s)`,
        () => intentar(() => Promise.all(lotes.map(({ c, prev }) => actualizar('contratos', c.id, prev))), 'Actualización masiva deshecha'));
    });
  },
  'whatsapp-aumento': ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    if (valorNuevo(c) <= 0) { aviso('Primero cargá el índice o escribí el alquiler nuevo'); return; }
    const t = d.personas.find((x) => x.id === c.tenantId);
    if (!t || !t.telefono) { aviso('El inquilino no tiene teléfono cargado'); return; }
    window.open(linkWhatsApp(t.telefono, mensajeWhatsApp(d, c, valorNuevo(c), c.proxAct)), '_blank', 'noopener');
  },
  'nota-aumento': ({ d, ds }) => {
    const c = d.contratos.find((x) => x.id === ds.id);
    const nuevo = valorNuevo(c);
    if (nuevo <= 0) { aviso('Primero cargá el índice o escribí el alquiler nuevo'); return; }
    imprimirNotaAumento(d, c, { fecha: c.proxAct, anterior: c.alquilerActual, nuevo, indice: indiceLabel(c, d.indices, nuevo) });
  },
  'notas-pendientes': ({ d }) => {
    const due = contratosActivos(d.contratos).filter((c) => pendienteActualizacion(c, hoyIso()) && valorNuevo(c) > 0);
    if (!due.length) { aviso('No hay notas para imprimir: falta cargar el índice o el alquiler nuevo'); return; }
    imprimir(due.map((c) => { const nuevo = valorNuevo(c); return notaAumentoHtml(d, c, { fecha: c.proxAct, anterior: c.alquilerActual, nuevo, indice: indiceLabel(c, d.indices, nuevo) }); }));
  },
};
