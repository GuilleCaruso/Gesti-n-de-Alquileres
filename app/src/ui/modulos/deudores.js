// Deudores: lo que quedó sin pagar de meses anteriores (y del mes actual, si ya venció), por contrato.
import { esc, money, periodoLabel, totalMonedas } from '../../domain/formato.js';
import { deudas, nombreCompleto } from '../../domain/consultas.js';
import { abrirWhatsApp, aviso, hoyIso, lupa, soyAdmin } from '../base.js';
import { icon } from '../icons.js';

const mesCorto = (per) => periodoLabel(per).replace(/^(\p{L}{3})\p{L}*\s(\d{2})(\d{2})$/u, '$1 $3');

export function vista({ d, params }) {
  const q = (params.get('q') || '').toLowerCase();
  const P = (id) => d.personas.find((x) => x.id === id);
  const PR = (id) => d.propiedades.find((x) => x.id === id) || { direccion: '—', localidad: '' };
  const todas = deudas(d.contratos, d.pagos, hoyIso());
  const lista = todas.filter(({ contrato: c }) => !q || [c.numero, PR(c.propertyId).direccion, nombreCompleto(P(c.tenantId)), nombreCompleto(P(c.ownerId))].join(' ').toLowerCase().includes(q));
  const meses = todas.reduce((s, x) => s + x.items.length, 0);
  const filas = lista.map(({ contrato: c, items, saldo, moneda }) => {
    const t = P(c.tenantId);
    return `<tr>
      <td class="cell-title tnum">${esc(c.numero || '—')}</td>
      <td><div class="cell-title">${esc(PR(c.propertyId).direccion)}</div><div class="cell-sub">${esc(PR(c.propertyId).localidad)}${c.estado !== 'Activo' ? ' · contrato finalizado' : ''}</div></td>
      <td>${esc(nombreCompleto(t))}<div class="cell-sub">${esc((t && t.telefono) || 'sin teléfono')}</div></td>
      <td><div class="chiprow">${items.map((x) => `<button class="badge ${x.parcial ? 'badge-info' : 'badge-danger'}" style="border:0; cursor:pointer; font:inherit; font-size:12px; font-weight:700;" data-nav="/cobranzas?p=${esc(x.periodo)}&q=${encodeURIComponent(c.numero || '')}" title="Ir a cobrar ${esc(periodoLabel(x.periodo))}">${esc(mesCorto(x.periodo))} · ${money(x.saldo, moneda)}${x.parcial ? ' (saldo)' : ''}</button>`).join('')}</div></td>
      <td class="num tnum cell-title">${money(saldo, moneda)}<div class="cell-sub">${items.length} ${items.length === 1 ? 'mes' : 'meses'}</div></td>
      <td class="row-actions"><button class="btn btn-sm" data-accion="whatsapp-deuda" data-id="${esc(c.id)}">${icon('phone')}Reclamar</button></td>
    </tr>`;
  }).join('');
  return `
    <div class="page-head"><div><h1 class="page-title">Deudores</h1><div class="page-sub">Alquileres impagos de meses anteriores y los de este mes que ya vencieron. Tocá un mes para ir a cobrarlo.</div></div></div>
    <div class="stat-grid" style="grid-template-columns:repeat(${soyAdmin() ? 3 : 2},1fr);">
      <div class="stat-tile"><div class="stat-value tnum" style="color:var(--${todas.length ? 'danger' : 'ok'}-600);">${todas.length}</div><div class="stat-label">Inquilinos con deuda</div></div>
      <div class="stat-tile"><div class="stat-value tnum">${meses}</div><div class="stat-label">Meses adeudados</div></div>
      ${soyAdmin() ? `<div class="stat-tile"><div class="stat-value tnum">${totalMonedas(todas.map((x) => [x.saldo, x.moneda]))}</div><div class="stat-label">Deuda total</div></div>` : ''}
    </div>
    <div class="search-wrap" style="max-width:340px; margin-bottom:16px;">${lupa}<input class="search-input" data-filtro="q" id="filtroDeudores" placeholder="Buscar N°, propiedad, inquilino o propietario..." value="${esc(params.get('q') || '')}"></div>
    <div class="table-wrap">${lista.length
      ? `<table><thead><tr><th>N°</th><th>Propiedad</th><th>Inquilino</th><th>Debe</th><th class="num">Total</th><th></th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty-state">${icon('check')}<div class="empty-state-title">${todas.length ? 'Nadie coincide con la búsqueda' : 'No hay deudas registradas'}</div></div>`}</div>
    <div class="page-sub" style="margin-top:12px;">La app controla la deuda desde el mes en que se cargó cada contrato. Si alguien debía de antes, cambiá "Controlar deuda desde" en <b>Editar contrato</b>.</div>`;
}

export const acciones = {
  'whatsapp-deuda': ({ d, ds }) => {
    const x = deudas(d.contratos, d.pagos, hoyIso()).find((y) => y.contrato.id === ds.id);
    if (!x) return;
    const c = x.contrato;
    const t = d.personas.find((p) => p.id === c.tenantId);
    if (!t || !t.telefono) { aviso('El inquilino no tiene teléfono cargado'); return; }
    const pr = d.propiedades.find((p) => p.id === c.propertyId) || {};
    const detalle = x.items.map((i) => `${periodoLabel(i.periodo)}: ${money(i.saldo, x.moneda)}${i.parcial ? ' (saldo)' : ''}`).join(', ');
    abrirWhatsApp(t.telefono, `Hola ${t.nombre || ''}! Te escribimos de Caruso Propiedades. Según nuestros registros, del alquiler de ${pr.direccion || ''} está pendiente de pago: ${detalle}.${x.items.length > 1 ? ` Total: ${money(x.saldo, x.moneda)}.` : ''} Si ya lo abonaste, por favor envianos el comprobante. Cualquier consulta, quedamos a disposición.`);
  },
};
