// Cobranzas del mes: se calculan desde los contratos activos; al cobrar se guarda el pago y se imprime el recibo.
import { esc, fdate, money, nextPeriodo, nombreMoneda, numeroALetras, periodoLabel, totalMonedas } from '../../domain/formato.js';
import { cobrosDelMes, estadoCobro, idPago, nombreCompleto } from '../../domain/consultas.js';
import { pagoTotal, pendienteActualizacion } from '../../domain/negocio.js';
import { guardar } from '../../services/datos.js';
import { abrirModal, aviso, botonesModal, campo, cerrarModal, docFoot, docHead, hoyIso, imprimir, INMOBILIARIA, intentar, LOGO, lupa, numero, periodoActual, soyAdmin } from '../base.js';
import { fecha, inputFecha } from '../campos.js';
import { icon } from '../icons.js';
import { badgeEstado } from './propiedades.js';

const prevPeriodo = (p) => { const [y, m] = p.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };

export function vista({ d, params }) {
  const periodo = params.get('p') || periodoActual();
  const q = (params.get('q') || '').toLowerCase();
  const hoy = hoyIso();
  const C = (id) => d.contratos.find((x) => x.id === id);
  const P = (id) => d.personas.find((x) => x.id === id);
  const PR = (id) => d.propiedades.find((x) => x.id === id) || { direccion: '—', localidad: '' };
  let cobros = cobrosDelMes(d.contratos, d.pagos, periodo, hoy);
  const cobradoDe = (p) => (p.estado === 'Pagado' ? pagoTotal(p) : p.estado === 'Parcial' ? p.pagado || 0 : 0);
  const total = totalMonedas(cobros.map((p) => [pagoTotal(p), p.moneda]));
  const cobrado = totalMonedas(cobros.map((p) => [cobradoDe(p), p.moneda]));
  const falta = totalMonedas(cobros.map((p) => [pagoTotal(p) - cobradoDe(p), p.moneda]));
  const nPagados = cobros.filter((p) => p.estado === 'Pagado').length;
  const nVencidos = cobros.filter((p) => estadoCobro(p, hoy) === 'Vencido').length;
  if (q) cobros = cobros.filter((p) => { const c = C(p.contractId); return [c?.numero, PR(c?.propertyId).direccion, PR(c?.propertyId).localidad, nombreCompleto(P(c?.tenantId)), nombreCompleto(P(c?.ownerId))].join(' ').toLowerCase().includes(q); });
  cobros.sort((a, b) => PR(C(a.contractId)?.propertyId).direccion.localeCompare(PR(C(b.contractId)?.propertyId).direccion));
  const filas = cobros.map((p) => {
    const c = C(p.contractId); const pr = PR(c?.propertyId); const est = estadoCobro(p, hoy);
    const $ = (n) => money(n, p.moneda);
    const detalle = [p.expensas ? 'exp ' + $(p.expensas) : null, p.servicios ? 'serv ' + $(p.servicios) : null].filter(Boolean).join(' + ');
    const avisoAct = c && c.estado === 'Activo' && pendienteActualizacion(c, hoy) && p.estado !== 'Pagado' ? `<div class="cell-sub" style="color:var(--warn-600);">${icon('alert')} actualización pendiente</div>` : '';
    return `<tr>
      <td class="cell-title tnum">${esc(c?.numero || '—')}</td>
      <td><div class="cell-title">${esc(pr.direccion)}</div><div class="cell-sub">${esc(pr.localidad)}</div></td>
      <td>${esc(nombreCompleto(P(c?.tenantId)))}</td>
      <td>${esc(nombreCompleto(P(c?.ownerId)))}</td>
      <td class="num tnum">${$(pagoTotal(p))}${detalle ? `<div class="cell-sub">alquiler ${$(p.importe)} + ${detalle}</div>` : ''}${p.estado === 'Parcial' ? `<div class="cell-sub">pagó ${$(p.pagado)}</div>` : ''}${avisoAct}${p.contratoVencido ? `<div class="cell-sub" style="color:var(--danger-600);">${icon('alert')} contrato vencido el ${fdate(c.fin)}</div>` : ''}</td>
      <td>${badgeEstado(est)}</td>
      <td class="tnum">${fdate(p.fechaPago)}${p.medio ? `<div class="cell-sub">${esc(p.medio)}</div>` : ''}</td>
      <td class="row-actions">${p.estado === 'Pagado'
        ? `<button class="btn btn-sm" data-accion="ver-recibo" data-id="${esc(p.id)}" data-p="${esc(periodo)}">${icon('printer')}Recibo</button><button class="btn btn-sm btn-ghost" data-accion="deshacer-cobro" data-id="${esc(p.id)}">Deshacer</button>`
        : `${p.estado === 'Parcial' ? `<button class="btn btn-sm" data-accion="ver-recibo" data-id="${esc(p.id)}" data-p="${esc(periodo)}">${icon('printer')}Recibo</button>` : ''}<button class="btn btn-sm btn-primary" data-accion="cobrar" data-id="${esc(p.id)}" data-p="${esc(periodo)}">${p.estado === 'Parcial' ? 'Seguir cobrando' : 'Cobrar'}</button>`}</td>
    </tr>`;
  }).join('');
  return `
    <div class="page-head">
      <div><h1 class="page-title">Cobranzas y recibos</h1>
        <div class="page-sub" style="display:flex; align-items:center; gap:8px;">
          <button class="btn btn-sm btn-ghost" data-param="p" data-valor="${prevPeriodo(periodo)}" aria-label="Mes anterior">‹</button>
          <b>${periodoLabel(periodo)}</b>
          <button class="btn btn-sm btn-ghost" data-param="p" data-valor="${nextPeriodo(periodo)}" aria-label="Mes siguiente">›</button>
        </div></div>
      <button class="btn" data-accion="recibos-del-mes" data-p="${esc(periodo)}">${icon('printer')}Imprimir recibos del mes</button>
    </div>
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">${soyAdmin() ? `
      <div class="stat-tile"><div class="stat-value tnum">${total}</div><div class="stat-label">Total del mes</div></div>
      <div class="stat-tile"><div class="stat-value tnum">${cobrado}</div><div class="stat-label">Cobrado</div></div>
      <div class="stat-tile"><div class="stat-value tnum">${falta}</div><div class="stat-label">Falta cobrar</div></div>` : `
      <div class="stat-tile"><div class="stat-value tnum">${nPagados} / ${cobros.length}</div><div class="stat-label">Alquileres cobrados</div></div>
      <div class="stat-tile"><div class="stat-value tnum">${cobros.length - nPagados}</div><div class="stat-label">Falta cobrar</div></div>
      <div class="stat-tile"><div class="stat-value tnum">${nVencidos}</div><div class="stat-label">Vencidos</div></div>`}
    </div>
    <div class="search-wrap" style="max-width:340px; margin-bottom:16px;">${lupa}<input class="search-input" data-filtro="q" id="filtroCobranzas" placeholder="Buscar N°, propiedad, inquilino o propietario..." value="${esc(params.get('q') || '')}"></div>
    <div class="table-wrap">${cobros.length
      ? `<table><thead><tr><th>N°</th><th>Propiedad</th><th>Inquilino</th><th>Propietario</th><th class="num">Importe</th><th>Estado</th><th>Pago</th><th></th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty-state">${icon('cobranzas')}<div class="empty-state-title">No hay alquileres para cobrar en ${periodoLabel(periodo)}</div><div>Se arman solos a partir de los contratos activos.</div></div>`}</div>`;
}

// Historial de cobros de un contrato, para la ficha de la propiedad.
export function cobrosContratoHtml(d, c) {
  const hoy = hoyIso();
  const periodos = [];
  for (let p = c.inicio.slice(0, 7), i = 0; p <= periodoActual() && i < 120; p = nextPeriodo(p), i++) periodos.push(p);
  const lista = periodos.slice(-12).reverse().map((per) => d.pagos.find((x) => x.contractId === c.id && x.periodo === per) || cobrosDelMes([c], [], per)[0]).filter(Boolean);
  return `<div class="table-wrap"><table><thead><tr><th>Mes</th><th class="num">Importe</th><th>Estado</th><th>Pago</th><th></th></tr></thead><tbody>
    ${lista.map((p) => `<tr><td>${periodoLabel(p.periodo)}</td><td class="num tnum">${money(pagoTotal(p), c.moneda)}</td><td>${badgeEstado(estadoCobro(p, hoy))}</td><td class="tnum">${fdate(p.fechaPago)}</td>
      <td class="row-actions">${p.estado === 'Pagado' || p.estado === 'Parcial' ? `<button class="btn btn-sm" data-accion="ver-recibo" data-id="${esc(p.id)}" data-p="${esc(p.periodo)}">${icon('printer')}Recibo</button>` : ''}
      ${p.estado !== 'Pagado' ? `<button class="btn btn-sm btn-primary" data-accion="cobrar" data-id="${esc(p.id)}" data-p="${esc(p.periodo)}">Cobrar</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div><div class="page-sub" style="margin-top:8px;">Últimos 12 meses del contrato.</div>`;
}

// Busca el cobro por id (guardado o "a cobrar" armado desde el contrato).
function cobroPorId(d, id, periodo) {
  return d.pagos.find((x) => x.id === id) || cobrosDelMes(d.contratos, d.pagos, periodo, hoyIso()).find((x) => x.id === id);
}

// ---------- recibo ----------
// Recibo de un cobro. Sin `opc`, es el último cobro registrado (o el mes entero si no hay cobros).
// `opc.monto` = lo que certifica este recibo; `opc.previo` = lo pagado antes en el mismo mes.
function datosRecibo(p, opc) {
  if (opc) return { monto: opc.monto, previo: opc.previo || 0 };
  const cobros = p.cobros || [];
  if (!cobros.length) return { monto: pagoTotal(p), previo: 0 };
  const ultimo = cobros[cobros.length - 1];
  return { monto: ultimo.monto, previo: cobros.slice(0, -1).reduce((s, x) => s + (x.monto || 0), 0), fecha: ultimo.fecha };
}

export function reciboHtml(d, p, opc) {
  const c = d.contratos.find((x) => x.id === p.contractId);
  const pr = d.propiedades.find((x) => x.id === c.propertyId) || {};
  const P = (id) => d.personas.find((x) => x.id === id);
  const recibidoDe = [P(c.tenantId), c.tenantId2 ? P(c.tenantId2) : null].filter(Boolean).map(nombreCompleto).join(' y ');
  const [y, m] = p.periodo.split('-').map(Number);
  const desde = new Date(y, m - 1, 1).toLocaleDateString('es-AR');
  const hasta = new Date(y, m, 0).toLocaleDateString('es-AR');
  const { monto, previo, fecha: fechaCobro } = datosRecibo(p, opc);
  const total = pagoTotal(p);
  const saldo = Math.max(0, total - previo - monto);
  const parcial = saldo > 0 || previo > 0;
  const $ = (n) => money(n, p.moneda);
  const letras = numeroALetras(monto);
  const nota = saldo > 0 ? ' (pago a cuenta)' : previo > 0 ? ' (cancela el saldo del mes)' : '';
  // en un pago parcial lo importante es cuánto pagó, cuánto debía y cuánto le queda
  const desglose = parcial ? `
          <div><span class="kv-label">Total del mes</span><div class="tnum">${$(total)}</div><div class="receipt-mini">alquiler ${$(p.importe)}${p.expensas ? ' + exp ' + $(p.expensas) : ''}${p.servicios ? ' + serv ' + $(p.servicios) : ''}</div></div>
          <div class="receipt-destacado"><span class="kv-label">Pagó ahora</span><div class="tnum">${$(monto)}</div>${previo ? `<div class="receipt-mini">antes ya había pagado ${$(previo)}</div>` : ''}</div>
          <div><span class="kv-label">${saldo > 0 ? 'Saldo pendiente' : 'Saldo'}</span><div class="tnum">${saldo > 0 ? $(saldo) : 'Cancelado'}</div></div>` : `
          <div><span class="kv-label">Alquiler</span><div class="tnum">${$(p.importe)}</div></div>
          <div><span class="kv-label">Expensas</span><div class="tnum">${p.expensas ? $(p.expensas) : '—'}</div></div>
          <div><span class="kv-label">Servicios</span><div class="tnum">${p.servicios ? $(p.servicios) : '—'}</div></div>`;
  return `
    <div class="receipt-print"><div class="receipt-box">
      <div class="receipt-side"><div>RECIBO DE ALQUILER</div><div class="receipt-nofactura">DOCUMENTO NO VÁLIDO COMO FACTURA</div></div>
      <div class="receipt-body">
        <div class="receipt-head"><img src="${LOGO}" alt=""><div class="receipt-org"><b>${esc(INMOBILIARIA.nombre)}</b><div>${esc(INMOBILIARIA.localidad)} · ${esc(INMOBILIARIA.telefono)}</div></div></div>
        <div class="receipt-row"><span class="rl">Contrato N°</span><span class="rv">${esc(c.numero || '—')}</span><span class="rl" style="margin-left:14px;">Fecha</span><span class="rv">${fdate(fechaCobro || p.fechaPago || hoyIso())}</span></div>
        <div class="receipt-row"><span class="rl">Recibido de</span><span class="rv">${esc(recibidoDe)}</span></div>
        <div class="receipt-row"><span class="rl">La suma de ${p.moneda === 'USD' ? 'US$' : '$'}</span><span class="rv tnum">${Math.round(monto).toLocaleString('es-AR')}${nota}</span></div>
        <div class="receipt-row"><span class="rl" style="white-space:normal;">${esc(letras.charAt(0).toUpperCase() + letras.slice(1))} ${nombreMoneda(p.moneda)}</span></div>
        <div class="receipt-row"><span class="rl">Por alquiler de</span><span class="rv">${esc(pr.direccion)}, ${esc(pr.localidad)}</span></div>
        <div class="receipt-row"><span class="rl">Correspondiente a</span><span class="rv">${periodoLabel(p.periodo)} (del ${desde} al ${hasta})</span></div>
        <div class="receipt-breakdown">${desglose}
        </div>
        <div class="receipt-sign">Firma _______________________________</div>
      </div>
    </div></div>`;
}
const CORTE = '<div class="receipt-cut"><span>✂ cortar aquí</span></div>';

function verRecibo(d, p, opc) {
  const box = abrirModal(reciboHtml(d, p, opc) + `
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px;">
      <button class="btn" data-cerrar>Cerrar</button>
      <button class="btn btn-primary" id="imprimirRecibo">${icon('printer')}Imprimir</button>
    </div>`, true);
  box.querySelector('#imprimirRecibo').onclick = () => imprimir([reciboHtml(d, p, opc)]);
}

function cobrarModal(d, p) {
  const c = d.contratos.find((x) => x.id === p.contractId);
  const pr = d.propiedades.find((x) => x.id === c.propertyId) || {};
  const t = d.personas.find((x) => x.id === c.tenantId);
  const pagadoYa = p.estado === 'Parcial' ? p.pagado || 0 : 0;
  const box = abrirModal(`
    <div class="section-title" style="margin-bottom:6px;">Registrar cobro</div>
    <div class="page-sub" style="margin-bottom:14px;">${esc(pr.direccion)} — ${esc(nombreCompleto(t))} — ${periodoLabel(p.periodo)}</div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="field"><label for="coAlq">Alquiler${p.moneda === 'USD' ? ' (dólares)' : ''}</label><input type="number" id="coAlq" min="0" step="any" value="${p.importe}" style="text-align:right;"><span class="cell-sub" id="coAlqNota"></span></div>
      <div class="field"><label for="coExp">Expensas</label><input type="number" id="coExp" min="0" step="100" value="${p.expensas || 0}" style="text-align:right;"></div>
      <div class="field"><label for="coServ">Servicios</label><input type="number" id="coServ" min="0" step="100" value="${p.servicios || 0}" style="text-align:right;"></div>
      <div class="field"><label>Total del mes</label><input id="coTotal" disabled style="text-align:right; font-weight:700;"></div>
      <div class="field"><label for="coMonto" id="coMontoLabel">Cobrado ahora</label><input type="number" id="coMonto" min="0" style="text-align:right;"></div>
      <div class="field"><label for="coMedio">Medio de pago</label><select id="coMedio"><option>Efectivo</option><option>Transferencia</option></select></div>
      <div class="field"><label for="coFecha">Fecha de pago</label>${inputFecha('coFecha', hoyIso())}</div>
    </div>
    ${botonesModal('Confirmar cobro', 'coOk')}`, true);
  const importe = () => numero('coAlq');
  const total = () => importe() + numero('coExp') + numero('coServ');
  const refrescar = () => {
    const saldo = Math.max(0, total() - pagadoYa);
    box.querySelector('#coTotal').value = money(total(), p.moneda);
    box.querySelector('#coMontoLabel').textContent = `Cobrado ahora (falta ${money(saldo, p.moneda)}${pagadoYa ? ', ya pagó ' + money(pagadoYa, p.moneda) : ''})`;
    box.querySelector('#coMonto').value = saldo;
    box.querySelector('#coAlqNota').textContent = importe() !== p.importe ? `Solo para este mes (el contrato dice ${money(p.importe, p.moneda)}). Si el contrato está mal, corregilo en el contrato o en Aumentos.` : '';
  };
  ['coAlq', 'coExp', 'coServ'].forEach((i) => box.querySelector('#' + i).addEventListener('input', refrescar));
  refrescar();
  box.querySelector('#coOk').onclick = async () => {
    const monto = numero('coMonto');
    if (monto <= 0) { aviso('Ingresá el monto cobrado'); return; }
    if (importe() <= 0) { aviso('Revisá el alquiler del mes'); return; }
    const saldoAntes = total() - pagadoYa;
    if (monto > saldoAntes + 0.5) {
      aviso(`Estás cobrando ${money(monto - saldoAntes, p.moneda)} más que lo que debe. Si el alquiler de este mes es mayor, cambialo en "Alquiler"; si es otro concepto, sumalo en "Servicios".`);
      return;
    }
    const fechaPago = fecha('coFecha');
    if (fechaPago === null) { aviso('La fecha de pago está mal escrita: usá dd/mm/aaaa'); return; }
    const nuevoTotal = total();
    const pagado = pagadoYa + monto;
    const completo = pagado >= nuevoTotal;
    const prev = p.nuevo ? null : { estado: p.estado, pagado: p.pagado || 0, fechaPago: p.fechaPago || null, medio: p.medio || null, expensas: p.expensas || 0, servicios: p.servicios || 0, cobros: p.cobros || [], importe: p.importe };
    const registro = {
      contractId: p.contractId, periodo: p.periodo, importe: importe(), vencimiento: p.vencimiento, moneda: p.moneda || 'ARS',
      expensas: numero('coExp'), servicios: numero('coServ'),
      estado: completo ? 'Pagado' : 'Parcial', pagado: completo ? nuevoTotal : pagado,
      fechaPago: fechaPago || hoyIso(), medio: campo('coMedio'),
      cobros: [...(p.cobros || []), { fecha: fechaPago || hoyIso(), monto, medio: campo('coMedio') }],
    };
    const id = idPago(p.contractId, p.periodo);
    const ok = await intentar(() => guardar('pagos', id, registro),
      completo ? 'Cobro registrado' : `Pago parcial registrado — faltan ${money(nuevoTotal - pagado, p.moneda)}`,
      () => intentar(() => guardar('pagos', id, prev || { estado: 'Pendiente', pagado: 0, fechaPago: null, medio: null, cobros: [] }), 'Cobro deshecho'));
    if (ok) {
      cerrarModal();
      const guardado = { ...p, ...registro, id };
      verRecibo(d, guardado, { monto, previo: pagadoYa });
    }
  };
}

function recibosDelMesModal(d, periodo) {
  const hoy = hoyIso();
  const cobros = cobrosDelMes(d.contratos, d.pagos, periodo, hoy);
  const C = (id) => d.contratos.find((x) => x.id === id);
  const PR = (id) => d.propiedades.find((x) => x.id === id) || {};
  const pend = cobros.filter((p) => { const c = C(p.contractId); return c && c.estado === 'Activo' && pendienteActualizacion(c, hoy); });
  const listos = cobros.length - pend.length;
  const box = abrirModal(`
    <div class="section-title" style="margin-bottom:4px;">Imprimir recibos — ${periodoLabel(periodo)}</div>
    <div class="page-sub" style="margin-bottom:14px;">Un recibo por alquiler del mes, cobrado o no, por el importe completo. Dos recibos por hoja A4.</div>
    <div class="task-list" style="margin-bottom:14px;">
      <div class="task-row"><span class="task-dot" style="background:var(--ok-600)"></span><div class="task-text"><b>${listos}</b> listos</div></div>
      <div class="task-row"><span class="task-dot" style="background:var(--warn-600)"></span><div class="task-text"><b>${pend.length}</b> con actualización pendiente${pend.length ? `<div class="task-sub">Saldrían con el alquiler anterior: ${pend.map((p) => esc(PR(C(p.contractId).propertyId).direccion)).join(' · ')}</div>` : ''}</div>${pend.length ? '<button class="btn btn-sm" data-cerrar data-nav="/aumentos">Ir a Aumentos</button>' : ''}</div>
    </div>
    ${pend.length ? `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
      <label style="display:flex; gap:8px; align-items:center;"><input type="radio" name="rcAlcance" value="todos" checked> Todos (${cobros.length})</label>
      <label style="display:flex; gap:8px; align-items:center;"><input type="radio" name="rcAlcance" value="listos"> Solo los listos (${listos})</label></div>` : ''}
    <label style="display:flex; gap:8px; align-items:center; margin-bottom:6px;"><input type="checkbox" id="rcPlanilla" checked> Incluir planilla de control (primera hoja)</label>
    ${botonesModal('Imprimir', 'rcOk')}`, true);
  box.querySelector('#rcOk').onclick = () => {
    const sel = box.querySelector('input[name="rcAlcance"]:checked');
    const lista = sel && sel.value === 'listos' ? cobros.filter((p) => !pend.includes(p)) : cobros;
    if (!lista.length) { aviso('No hay recibos para imprimir'); return; }
    const paginas = [];
    if (box.querySelector('#rcPlanilla').checked) paginas.push(planillaHtml(d, lista, pend, periodo));
    for (let i = 0; i < lista.length; i += 2) {
      const entero = (p) => reciboHtml(d, p, { monto: pagoTotal(p), previo: 0 });
      paginas.push(entero(lista[i]) + (lista[i + 1] ? CORTE + entero(lista[i + 1]) : ''));
    }
    cerrarModal();
    imprimir(paginas);
  };
}

function planillaHtml(d, lista, pend, periodo) {
  const C = (id) => d.contratos.find((x) => x.id === id);
  const PR = (id) => d.propiedades.find((x) => x.id === id) || {};
  const P = (id) => d.personas.find((x) => x.id === id);
  const total = totalMonedas(lista.map((p) => [pagoTotal(p), p.moneda]));
  return docHead('Planilla de control de recibos', periodoLabel(periodo)) + `
    <table><thead><tr><th>Contrato</th><th>Propiedad</th><th>Inquilino</th><th class="num">Importe</th><th>Cobro</th><th>Actualización</th></tr></thead><tbody>
    ${lista.map((p) => { const c = C(p.contractId); return `<tr><td>${esc(c.numero || '—')}</td><td>${esc(PR(c.propertyId).direccion)}</td><td>${esc(nombreCompleto(P(c.tenantId)))}</td><td class="num">${money(pagoTotal(p), p.moneda)}</td><td>${esc(p.estado === 'Parcial' ? 'Parcial — ' + money(p.pagado, p.moneda) : p.estado)}</td><td>${pend.includes(p) ? '<span class="doc-warn">⚠ Pendiente</span>' : '✓'}</td></tr>`; }).join('')}
    <tr class="doc-total"><td colspan="3">${lista.length} recibos</td><td class="num">${soyAdmin() ? total : ''}</td><td colspan="2"></td></tr></tbody></table>
    ${docFoot()}`;
}

export const acciones = {
  cobrar: ({ d, ds }) => { const p = cobroPorId(d, ds.id, ds.p); if (p) cobrarModal(d, p); },
  'ver-recibo': ({ d, ds }) => { const p = cobroPorId(d, ds.id, ds.p); if (p) verRecibo(d, p); },
  'recibos-del-mes': ({ d, ds }) => recibosDelMesModal(d, ds.p),
  'deshacer-cobro': ({ d, ds }) => {
    const p = d.pagos.find((x) => x.id === ds.id);
    if (!p) return;
    const prev = { estado: p.estado, pagado: p.pagado || 0, fechaPago: p.fechaPago || null, medio: p.medio || null, cobros: p.cobros || [] };
    intentar(() => guardar('pagos', p.id, { estado: 'Pendiente', pagado: 0, fechaPago: null, medio: null, cobros: [] }), 'Cobro revertido a pendiente',
      () => intentar(() => guardar('pagos', p.id, prev), 'Cobro restaurado'));
  },
};

