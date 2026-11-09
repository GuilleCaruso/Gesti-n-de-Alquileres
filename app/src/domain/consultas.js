// Consultas puras sobre los datos cargados (personas, propiedades, contratos, pagos).
// No leen la base: reciben los arrays y devuelven resultados. Se prueban en tests/domain.

import { pagoTotal } from './negocio.js';

export const nombreCompleto = (p) => (p ? `${p.nombre || ''} ${p.apellido || ''}`.trim() || '—' : '—');

// Suma meses a una fecha ISO sin desbordar (31/01 + 1 mes = 28 o 29/02, no 3/03).
// Fin de contrato por defecto: 2 años menos un día (01/09/2025 → 31/08/2027).
export function finPorDefecto(inicio, meses = 24) {
  const f = new Date(addMonths(inicio, meses) + 'T00:00:00Z');
  f.setUTCDate(f.getUTCDate() - 1);
  return f.toISOString().slice(0, 10);
}

export function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}

export const contratosActivos = (contratos) => contratos.filter((c) => c.estado === 'Activo');

// El contrato vigente de una propiedad (como mucho uno activo).
export const contratoVigente = (contratos, propertyId) => contratos.find((c) => c.propertyId === propertyId && c.estado === 'Activo') || null;

// El inquilino actual sale del contrato vigente: no se guarda en la propiedad (PROJECT_RULES 8).
export const inquilinoActual = (contratos, propertyId) => contratoVigente(contratos, propertyId)?.tenantId || null;

export const estadoPropiedad = (prop, contratos) => (contratoVigente(contratos, prop.id) ? 'Alquilada' : prop.estado === 'Alquilada' ? 'Disponible' : prop.estado || 'Disponible');

export const cubrePeriodo = (c, periodo) => c.inicio.slice(0, 7) <= periodo && (!c.fin || c.fin.slice(0, 7) >= periodo);

export const idPago = (contractId, periodo) => `${contractId}_${periodo}`;

// Cobro del mes de un contrato: el guardado, o uno "a cobrar" armado desde el contrato si todavía no se registró nada.
export function cobroDelMes(contrato, periodo, pagos) {
  const existente = pagos.find((p) => p.contractId === contrato.id && p.periodo === periodo);
  if (existente) return existente;
  const exp = contrato.expensas && contrato.expensas.aplica ? contrato.expensas.monto || 0 : 0;
  return {
    id: idPago(contrato.id, periodo), contractId: contrato.id, periodo, moneda: contrato.moneda || 'ARS',
    importe: alquilerDelPeriodo(contrato, periodo), expensas: exp, servicios: 0,
    estado: 'Pendiente', vencimiento: `${periodo}-${String(contrato.diaVencimiento || 10).padStart(2, '0')}`, nuevo: true,
  };
}

// Todos los cobros del mes: contratos activos que cubren el período + cobros ya registrados de contratos que terminaron.
export function cobrosDelMes(contratos, pagos, periodo) {
  const activos = contratosActivos(contratos).filter((c) => cubrePeriodo(c, periodo));
  const lista = activos.map((c) => cobroDelMes(c, periodo, pagos));
  pagos.filter((p) => p.periodo === periodo && !activos.some((c) => c.id === p.contractId)).forEach((p) => lista.push(p));
  // los cobros guardados antes de que existiera la moneda toman la del contrato
  return lista.map((p) => (p.moneda ? p : { ...p, moneda: contratos.find((c) => c.id === p.contractId)?.moneda || 'ARS' }));
}

// Estado para mostrar: un pendiente con vencimiento pasado es "Vencido".
export function estadoCobro(pago, hoyIso) {
  if (pago.estado === 'Pagado' || pago.estado === 'Parcial') return pago.estado;
  return pago.vencimiento && pago.vencimiento < hoyIso ? 'Vencido' : 'Pendiente';
}

export const saldoCobro = (p) => pagoTotal(p) - (p.estado === 'Parcial' ? p.pagado || 0 : 0);

// Cambios a guardar al aplicar un aumento: nuevo alquiler, próxima fecha y una línea más de historial.
// `fecha` = desde cuándo rige (la próxima actualización que vencía); `registrado` = el día que se cargó.
export function datosAumento(contrato, nuevo, indice, hoyIso) {
  return {
    alquilerActual: nuevo,
    proxAct: addMonths(contrato.proxAct, contrato.frecuencia),
    historial: [...(contrato.historial || []), { fecha: contrato.proxAct, registrado: hoyIso, anterior: contrato.alquilerActual, nuevo, indice }],
  };
}

// Deshacer el último aumento: vuelve el monto anterior, la fecha de actualización y saca la línea del historial.
export function deshacerUltimoAumento(contrato) {
  const hist = contrato.historial || [];
  if (!hist.length) return null;
  const ultimo = hist[hist.length - 1];
  return { alquilerActual: ultimo.anterior, proxAct: ultimo.fecha, historial: hist.slice(0, -1) };
}

// Alquiler vigente en un mes: si un aumento rige después de ese mes, se usa el monto anterior.
export function alquilerDelPeriodo(contrato, periodo) {
  let monto = contrato.alquilerActual;
  const hist = [...(contrato.historial || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const h of hist) if (h.fecha.slice(0, 7) > periodo) monto = h.anterior;
  return monto;
}

// Buscador global: dirección, localidad, tipo, ID, N° de contrato, propietario e inquilino; y personas por nombre o DNI.
export function buscar(q, { personas, propiedades, contratos }) {
  const t = (q || '').trim().toLowerCase();
  if (!t) return { propiedades: [], personas: [] };
  const P = (id) => personas.find((p) => p.id === id);
  const props = propiedades.filter((pr) => {
    const c = contratoVigente(contratos, pr.id);
    const texto = [pr.id, pr.tipo, pr.direccion, pr.localidad, nombreCompleto(P(pr.ownerId)), c ? nombreCompleto(P(c.tenantId)) : '', c ? c.numero : ''].join(' ').toLowerCase();
    return t.split(/\s+/).every((w) => texto.includes(w));
  });
  const ppl = personas.filter((p) => {
    const texto = [nombreCompleto(p), p.dni, p.telefono].join(' ').toLowerCase();
    return t.split(/\s+/).every((w) => texto.includes(w));
  });
  return { propiedades: props.slice(0, 8), personas: ppl.slice(0, 8) };
}
