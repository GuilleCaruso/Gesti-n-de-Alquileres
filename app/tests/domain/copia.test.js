import { describe, expect, test } from 'vitest';
import { copiaCompleta, diasSinCopia, hojasCopia, limpiar } from '../../src/domain/copia.js';

const datos = {
  personas: [{ id: 'p1', nombre: 'Juan', apellido: 'Pérez', dni: '30', roles: ['Inquilino'] }, { id: 'p2', nombre: 'Ana', apellido: 'Gómez', roles: ['Propietario'] }],
  propiedades: [{ id: 'pr1', direccion: 'Belgrano 1', localidad: 'Paso del Rey', ownerId: 'p2' }],
  contratos: [{ id: 'c1', numero: '76', estado: 'Activo', propertyId: 'pr1', tenantId: 'p1', ownerId: 'p2', inicio: '2026-04-01', fin: '2028-03-31', alquilerActual: 630000, tipoAumento: 'Fijo', pctFijo: 8, frecuencia: 3, proxAct: '2027-01-01', honorarios: { tipo: 'porcentaje', valor: 5 }, creadoEn: { toDate: () => new Date('2026-11-09T00:00:00Z') } }],
  pagos: [{ id: 'c1_2026-11', contractId: 'c1', periodo: '2026-11', estado: 'Parcial', importe: 630000, pagado: 300000, fechaPago: '2026-11-10', medio: 'Efectivo', cobros: [{ fecha: '2026-11-10', monto: 300000, medio: 'Efectivo' }] }],
};

describe('copia de seguridad', () => {
  test('Excel: una hoja por tipo de dato, con nombres en vez de códigos', () => {
    const hojas = hojasCopia(datos);
    expect(hojas.map((h) => h.sheet)).toEqual(['Contratos', 'Cobros', 'Propiedades', 'Personas']);
    const contrato = hojas[0].data[1];
    expect(contrato.slice(0, 5)).toEqual(['76', 'Activo', 'Belgrano 1', 'Paso del Rey', 'Pérez, Juan']);
    expect(contrato).toContain('01/04/2026');
    expect(contrato).toContain('8% fijo');
    expect(hojas[1].data[1]).toContain('10/11/2026: 300000 (Efectivo)');
  });
  test('archivo completo: conserva los ids y convierte las fechas internas', () => {
    const j = JSON.parse(copiaCompleta(datos, '2026-11-11T12:00:00.000Z'));
    expect(j.contratos[0].id).toBe('c1');
    expect(j.contratos[0].creadoEn).toBe('2026-11-09T00:00:00.000Z');
    expect(j.pagos[0].cobros[0].monto).toBe(300000);
    expect(limpiar({ a: [{ b: null }] })).toEqual({ a: [{ b: null }] });
  });
  test('días desde la última copia', () => {
    expect(diasSinCopia(null, '2026-11-11')).toBe(null);
    expect(diasSinCopia('2026-11-01', '2026-11-11')).toBe(10);
  });
});
