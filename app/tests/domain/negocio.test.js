import { describe, expect, test } from 'vitest';
import { calcHonorarios, montoLiquidable, noLiquida, pagoTotal, periodoDescuento, computeNuevo, pendienteActualizacion } from '../../src/domain/negocio.js';
import { numeroALetras, nextPeriodo, periodoLabel, money } from '../../src/domain/formato.js';
import { cuentasPara, cuentasVisibles, esAdmin, puedeEntrar } from '../../src/domain/permisos.js';

describe('honorarios (PROJECT_RULES 20)', () => {
  test('porcentaje sobre lo liquidado', () => {
    expect(calcHonorarios({ tipo: 'porcentaje', valor: 5 }, 578500)).toBe(28925);
    expect(calcHonorarios({ tipo: 'porcentaje', valor: 10 }, 720000)).toBe(72000);
  });
  test('monto fijo, nunca más que lo cobrado', () => {
    expect(calcHonorarios({ tipo: 'fijo', valor: 40000 }, 494500)).toBe(40000);
    expect(calcHonorarios({ tipo: 'fijo', valor: 40000 }, 30000)).toBe(30000);
  });
  test('sin cobro no hay honorarios', () => {
    expect(calcHonorarios({ tipo: 'fijo', valor: 40000 }, 0)).toBe(0);
  });
  test('5% por defecto si el contrato no lo define', () => {
    expect(calcHonorarios(undefined, 100000)).toBe(5000);
  });
});

describe('cobros y liquidación', () => {
  const pago = { importe: 690000, expensas: 15000, servicios: 8000, estado: 'Pagado' };
  test('total = alquiler + expensas + servicios', () => {
    expect(pagoTotal(pago)).toBe(713000);
  });
  test('expensas destildadas no van al propietario (ni pagan honorarios)', () => {
    const p = { ...pago, expensasLiq: false };
    expect(noLiquida(p)).toBe(15000);
    expect(montoLiquidable(p)).toBe(698000);
  });
  test('pago parcial liquida lo cobrado', () => {
    expect(montoLiquidable({ importe: 560000, estado: 'Parcial', pagado: 300000 })).toBe(300000);
  });
  test('pendiente no liquida nada', () => {
    expect(montoLiquidable({ importe: 560000, estado: 'Pendiente' })).toBe(0);
  });
});

describe('arreglos: en qué liquidación se descuentan (PROJECT_RULES 22)', () => {
  const arreglo = { pagadoPor: 'Propietario', fechaResuelto: '2026-09-08' };
  test('si todavía no se le pagó septiembre al propietario → septiembre', () => {
    expect(periodoDescuento(arreglo, () => false)).toBe('2026-09');
  });
  test('si septiembre ya se pagó → octubre', () => {
    expect(periodoDescuento(arreglo, (p) => p === '2026-09')).toBe('2026-10');
  });
  test('si lo paga el inquilino no va a liquidación', () => {
    expect(periodoDescuento({ ...arreglo, pagadoPor: 'Inquilino' }, () => false)).toBe(null);
  });
  test('una vez liquidado queda fijo en ese mes', () => {
    expect(periodoDescuento({ ...arreglo, periodoLiquidacion: '2026-09' }, () => true)).toBe('2026-09');
  });
});

describe('aumentos', () => {
  test('ICL redondeado a $500', () => {
    expect(computeNuevo({ tipoAumento: 'ICL', alquilerActual: 610000 }, { ICL: 3.4, IPC: 4.1 })).toBe(630500);
  });
  test('personalizado no cambia solo', () => {
    expect(computeNuevo({ tipoAumento: 'Personalizado', alquilerActual: 470000 }, { ICL: 3.4, IPC: 4.1 })).toBe(470000);
  });
  test('pendiente cuando la próxima actualización ya pasó', () => {
    expect(pendienteActualizacion({ proxAct: '2026-09-01' }, '2026-09-14')).toBe(true);
    expect(pendienteActualizacion({ proxAct: '2026-12-01' }, '2026-09-14')).toBe(false);
  });
});

describe('formatos', () => {
  test('monto en letras del recibo', () => {
    expect(numeroALetras(632000)).toBe('seiscientos treinta y dos mil');
    expect(numeroALetras(713000)).toBe('setecientos trece mil');
    expect(numeroALetras(1331225)).toBe('un millón trescientos treinta y un mil doscientos veinticinco');
  });
  test('períodos', () => {
    expect(nextPeriodo('2026-12')).toBe('2027-01');
    expect(periodoLabel('2026-09')).toBe('Septiembre 2026');
    expect(money(632000)).toBe('$ 632.000');
  });
});

describe('permisos en pantalla', () => {
  const cuentas = [
    { id: 'chica', efectivo: true, soloAdmin: false },
    { id: 'grande', efectivo: true, soloAdmin: true },
    { id: 'icbc', efectivo: false, soloAdmin: false },
  ];
  const admin = { rol: 'admin', activo: true };
  const emp = { rol: 'empleado', activo: true };
  test('el empleado no ve la caja grande', () => {
    expect(cuentasVisibles(cuentas, emp).map((c) => c.id)).toEqual(['chica', 'icbc']);
    expect(cuentasVisibles(cuentas, admin)).toHaveLength(3);
  });
  test('el empleado cobra en efectivo pero paga solo por banco', () => {
    expect(cuentasPara(cuentas, emp, 'ingreso').map((c) => c.id)).toEqual(['chica', 'icbc']);
    expect(cuentasPara(cuentas, emp, 'egreso').map((c) => c.id)).toEqual(['icbc']);
  });
  test('un administrador dado de baja no es administrador', () => {
    expect(esAdmin({ rol: 'admin', activo: false })).toBe(false);
  });
  test('solo el administrador entra a Usuarios', () => {
    expect(puedeEntrar('usuarios', admin)).toBe(true);
    expect(puedeEntrar('usuarios', emp)).toBe(false);
    expect(puedeEntrar('caja', emp)).toBe(true);
  });
});
