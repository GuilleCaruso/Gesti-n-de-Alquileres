// Reglas de negocio confirmadas en el prototipo (ver PROJECT_RULES.md, sección 4).
// Funciones puras: no leen ni escriben la base. Se prueban en tests/domain.

import { nextPeriodo } from './formato.js';

export const HONORARIOS_DEFAULT = { tipo: 'porcentaje', valor: 5 };

// Total del período: alquiler + expensas + servicios.
export const pagoTotal = (p) => p.importe + (p.expensas || 0) + (p.servicios || 0);

// Lo cobrado que NO va al propietario (expensas/servicios destildados al cobrar).
export const noLiquida = (p) =>
  (p.expensas && p.expensasLiq === false ? p.expensas : 0) + (p.servicios && p.serviciosLiq === false ? p.servicios : 0);

// Lo que entra en la liquidación del propietario por ese pago.
export function montoLiquidable(p) {
  const bruto = p.estado === 'Pagado' ? pagoTotal(p) : p.estado === 'Parcial' ? p.pagado || 0 : 0;
  return Math.max(0, bruto - (bruto > 0 ? noLiquida(p) : 0));
}

// Honorarios de un mes sobre lo que se liquida: porcentaje, o monto fijo si hubo cobro (nunca más que lo cobrado).
export function calcHonorarios(honorarios, monto) {
  if (monto <= 0) return 0;
  const h = honorarios || HONORARIOS_DEFAULT;
  return h.tipo === 'fijo' ? Math.min(h.valor, monto) : Math.round((monto * h.valor) / 100);
}

export const honorariosLabel = (h) => {
  const x = h || HONORARIOS_DEFAULT;
  return x.tipo === 'fijo' ? 'monto fijo $ ' + Math.round(x.valor).toLocaleString('es-AR') : x.valor + '%';
};

// En qué liquidación se descuenta un arreglo a cargo del propietario:
// la del mes en que se arregló (y se pagó al especialista) si todavía no se le pagó al propietario;
// si ya se le pagó, la siguiente. `liquidacionPagada(periodo)` dice si la de ese mes ya se pagó.
export function periodoDescuento(arreglo, liquidacionPagada) {
  if (arreglo.periodoLiquidacion) return arreglo.periodoLiquidacion;
  if (arreglo.pagadoPor !== 'Propietario' || !arreglo.fechaResuelto) return null;
  let per = arreglo.fechaResuelto.slice(0, 7);
  for (let i = 0; i < 120 && liquidacionPagada(per); i++) per = nextPeriodo(per);
  return per;
}

// Contrato con actualización vencida a la fecha `hoyIso`.
export const pendienteActualizacion = (contrato, hoyIso) => contrato.proxAct <= hoyIso;

// Próximo alquiler sugerido según el índice, redondeado a $500.
export function computeNuevo(contrato, indices) {
  const r = (n) => Math.round(n / 500) * 500;
  if (contrato.tipoAumento === 'ICL') return r(contrato.alquilerActual * (1 + indices.ICL / 100));
  if (contrato.tipoAumento === 'IPC') return r(contrato.alquilerActual * (1 + indices.IPC / 100));
  if (contrato.tipoAumento === 'Fijo') return r(contrato.alquilerActual * (1 + contrato.pctFijo / 100));
  return contrato.alquilerActual;
}
