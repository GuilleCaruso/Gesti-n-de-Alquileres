// Copia de seguridad: arma las hojas del Excel (para leer) y el archivo completo (para restaurar).
const nombre = (p) => (p ? `${p.apellido || ''}, ${p.nombre || ''}` : '');
const fechaTexto = (iso) => (iso ? String(iso).split('-').reverse().join('/') : '');

// Fechas internas de Firestore (Timestamp) → texto ISO, para que el archivo sea legible y restaurable.
export function limpiar(v) {
  if (v == null) return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(limpiar);
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, limpiar(x)]));
  return v;
}

export function hojasCopia({ personas, propiedades, contratos, pagos }) {
  const P = (id) => personas.find((x) => x.id === id);
  const PR = (id) => propiedades.find((x) => x.id === id) || {};
  const C = (id) => contratos.find((x) => x.id === id) || {};
  const porNumero = (a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), undefined, { numeric: true });
  const tipo = (c) => (c.tipoAumento === 'Fijo' ? `${c.pctFijo ?? ''}% fijo` : c.tipoAumento || '');
  const hon = (h) => (!h ? '' : h.tipo === 'fijo' ? `$ ${h.valor} fijo` : `${h.valor}%`);
  return [
    { sheet: 'Contratos', data: [
      ['N°', 'Estado', 'Dirección', 'Localidad', 'Inquilino', 'Inquilino 2', 'Garante', 'Propietario', 'Inicio', 'Fin', 'Moneda', 'Alquiler actual', 'Depósito', 'Tipo de aumento', 'Cada (meses)', 'Próximo aumento', 'Expensas', 'Honorarios', 'Vence el día', 'Observaciones'],
      ...contratos.slice().sort(porNumero).map((c) => [c.numero || '', c.estado || '', PR(c.propertyId).direccion || '', PR(c.propertyId).localidad || '', nombre(P(c.tenantId)), nombre(P(c.tenantId2)), nombre(P(c.guarantorId)), nombre(P(c.ownerId)),
        fechaTexto(c.inicio), fechaTexto(c.fin), c.moneda === 'USD' ? 'Dólares' : 'Pesos', c.alquilerActual ?? null, c.deposito ?? null, tipo(c), c.frecuencia ?? null, fechaTexto(c.proxAct),
        c.expensas && c.expensas.aplica ? c.expensas.monto || 0 : null, hon(c.honorarios), c.diaVencimiento ?? null, c.obs || '']),
    ] },
    { sheet: 'Cobros', data: [
      ['N° contrato', 'Dirección', 'Inquilino', 'Período', 'Estado', 'Moneda', 'Alquiler', 'Expensas', 'Servicios', 'Pagado', 'Fecha de pago', 'Medio', 'Detalle de pagos'],
      ...pagos.slice().sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)) || porNumero(C(a.contractId), C(b.contractId))).map((p) => {
        const c = C(p.contractId);
        return [c.numero || '', PR(c.propertyId).direccion || '', nombre(P(c.tenantId)), p.periodo || '', p.estado || '', (p.moneda || c.moneda) === 'USD' ? 'Dólares' : 'Pesos',
          p.importe ?? null, p.expensas || null, p.servicios || null, p.pagado ?? null, fechaTexto(p.fechaPago), p.medio || '',
          (p.cobros || []).map((x) => `${fechaTexto(x.fecha)}: ${x.monto} (${x.medio || ''})`).join(' | ')];
      }),
    ] },
    { sheet: 'Propiedades', data: [
      ['Dirección', 'Localidad', 'Tipo', 'Estado', 'Propietario', 'Ambientes', 'Dormitorios', 'Baños', 'm²', 'Gas', 'Luz', 'Agua', 'Partida municipal', 'Observaciones'],
      ...propiedades.slice().sort((a, b) => String(a.direccion || '').localeCompare(String(b.direccion || ''))).map((x) => [x.direccion || '', x.localidad || '', x.tipo || '', x.estado || '', nombre(P(x.ownerId)),
        x.ambientes ?? null, x.dormitorios ?? null, x.banos ?? null, x.m2 || null, x.nroGas || '', x.nroLuz || '', x.nroAgua || '', x.nroMunicipal || '', x.obs || '']),
    ] },
    { sheet: 'Personas', data: [
      ['Apellido', 'Nombre', 'DNI', 'CUIT', 'Teléfono', 'Email', 'Domicilio', 'Roles'],
      ...personas.slice().sort((a, b) => nombre(a).localeCompare(nombre(b))).map((x) => [x.apellido || '', x.nombre || '', x.dni || '', x.cuit || '', x.telefono || '', x.email || '', x.domicilio || '', (x.roles || []).join(', ')]),
    ] },
  ];
}

// Archivo completo, tal cual está en la base (con los ids), para poder restaurar.
export const copiaCompleta = (datos, hechaEl) => JSON.stringify({ app: 'caruso-propiedades', version: 1, hechaEl, ...limpiar(datos) });

// ¿Hace cuántos días se hizo la última copia? null = nunca.
export function diasSinCopia(ultimaIso, hoyIso) {
  if (!ultimaIso) return null;
  return Math.round((new Date(hoyIso + 'T00:00:00Z') - new Date(ultimaIso.slice(0, 10) + 'T00:00:00Z')) / 86400000);
}
