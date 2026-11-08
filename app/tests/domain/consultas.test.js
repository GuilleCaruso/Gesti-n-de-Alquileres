import { describe, expect, test } from 'vitest';
import { addMonths, alquilerDelPeriodo, deshacerUltimoAumento, finPorDefecto, buscar, cobrosDelMes, contratoVigente, datosAumento, estadoCobro, estadoPropiedad, saldoCobro } from '../../src/domain/consultas.js';

const personas = [
  { id: 'p1', nombre: 'Carlos', apellido: 'Pérez', dni: '18.334.221', roles: ['Propietario'] },
  { id: 'p2', nombre: 'Sofía', apellido: 'Molina', dni: '36.774.221', roles: ['Inquilino'] },
];
const propiedades = [
  { id: 'pr1', tipo: 'Duplex', direccion: 'Sarmiento 340', localidad: 'Paso del Rey', ownerId: 'p1', estado: 'Disponible' },
  { id: 'pr2', tipo: 'Casa', direccion: 'Belgrano 1234', localidad: 'Moreno', ownerId: 'p1', estado: 'Disponible' },
];
const contratos = [
  { id: 'c1', numero: '0149', propertyId: 'pr1', ownerId: 'p1', tenantId: 'p2', estado: 'Activo', inicio: '2025-01-15', fin: '2027-01-14', alquilerActual: 560000, expensas: { aplica: true, monto: 20000 }, frecuencia: 3, proxAct: '2026-10-15', historial: [] },
  { id: 'c0', numero: '0100', propertyId: 'pr2', ownerId: 'p1', tenantId: 'p2', estado: 'Finalizado', inicio: '2023-01-01', fin: '2025-12-31', alquilerActual: 300000, frecuencia: 6, proxAct: '2025-07-01' },
];

describe('deshacer aumento', () => {
  test('vuelve al monto y la fecha anteriores y saca la línea del historial', () => {
    const c = { alquilerActual: 500000, proxAct: '2026-12-01', historial: [
      { fecha: '2026-06-01', anterior: 400000, nuevo: 450000 }, { fecha: '2026-09-01', anterior: 450000, nuevo: 500000 }] };
    expect(deshacerUltimoAumento(c)).toEqual({ alquilerActual: 450000, proxAct: '2026-09-01', historial: [c.historial[0]] });
    expect(deshacerUltimoAumento({ alquilerActual: 1, historial: [] })).toBe(null);
  });
});

describe('fechas', () => {
  test('fin de contrato por defecto: 2 años menos un día', () => {
    expect(finPorDefecto('2025-09-01')).toBe('2027-08-31');
    expect(finPorDefecto('2025-03-15')).toBe('2027-03-14');
    expect(finPorDefecto('2026-01-01')).toBe('2027-12-31');
  });
  test('sumar meses no desborda fin de mes', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-10-15', 3)).toBe('2027-01-15');
  });
});

describe('propiedades y contratos', () => {
  test('el contrato vigente es el activo', () => {
    expect(contratoVigente(contratos, 'pr1').id).toBe('c1');
    expect(contratoVigente(contratos, 'pr2')).toBe(null);
  });
  test('el estado de la propiedad sale del contrato', () => {
    expect(estadoPropiedad(propiedades[0], contratos)).toBe('Alquilada');
    expect(estadoPropiedad(propiedades[1], contratos)).toBe('Disponible');
  });
});

describe('cobros del mes', () => {
  test('sin nada registrado, arma el cobro desde el contrato con sus expensas', () => {
    const [c] = cobrosDelMes(contratos, [], '2026-11');
    expect(c).toMatchObject({ contractId: 'c1', importe: 560000, expensas: 20000, estado: 'Pendiente', vencimiento: '2026-11-10', nuevo: true });
    expect(saldoCobro(c)).toBe(580000);
  });
  test('un contrato finalizado no genera cobro nuevo', () => {
    expect(cobrosDelMes(contratos, [], '2026-11')).toHaveLength(1);
  });
  test('usa el cobro registrado si existe', () => {
    const pagos = [{ id: 'c1_2026-11', contractId: 'c1', periodo: '2026-11', importe: 560000, estado: 'Parcial', pagado: 300000 }];
    const [c] = cobrosDelMes(contratos, pagos, '2026-11');
    expect(c.estado).toBe('Parcial');
    expect(saldoCobro(c)).toBe(260000);
  });
  test('pendiente pasado el vencimiento se muestra vencido', () => {
    expect(estadoCobro({ estado: 'Pendiente', vencimiento: '2026-11-10' }, '2026-11-12')).toBe('Vencido');
    expect(estadoCobro({ estado: 'Pendiente', vencimiento: '2026-11-10' }, '2026-11-05')).toBe('Pendiente');
    expect(estadoCobro({ estado: 'Pagado', vencimiento: '2026-11-10' }, '2026-11-12')).toBe('Pagado');
  });
});

describe('aumentos', () => {
  test('guarda el historial y corre la próxima fecha según la frecuencia', () => {
    const d = datosAumento(contratos[0], 600000, 'ICL 7,1%', '2026-11-07');
    expect(d.alquilerActual).toBe(600000);
    expect(d.proxAct).toBe('2027-01-15');
    expect(d.historial).toEqual([{ fecha: '2026-10-15', registrado: '2026-11-07', anterior: 560000, nuevo: 600000, indice: 'ICL 7,1%' }]);
  });
  test('cada mes cobra el alquiler vigente en ese mes', () => {
    const c = { alquilerActual: 600000, historial: [{ fecha: '2026-11-01', anterior: 560000, nuevo: 600000 }] };
    expect(alquilerDelPeriodo(c, '2026-10')).toBe(560000);
    expect(alquilerDelPeriodo(c, '2026-11')).toBe(600000);
    expect(alquilerDelPeriodo(c, '2026-12')).toBe(600000);
  });
});

describe('buscador global', () => {
  const datos = { personas, propiedades, contratos };
  test('por dirección y localidad juntas', () => {
    expect(buscar('sarmiento paso', datos).propiedades.map((p) => p.id)).toEqual(['pr1']);
  });
  test('por inquilino actual y por N° de contrato', () => {
    expect(buscar('molina', datos).propiedades.map((p) => p.id)).toEqual(['pr1']);
    expect(buscar('0149', datos).propiedades.map((p) => p.id)).toEqual(['pr1']);
  });
  test('personas por apellido o DNI', () => {
    expect(buscar('pérez', datos).personas.map((p) => p.id)).toEqual(['p1']);
    expect(buscar('36.774', datos).personas.map((p) => p.id)).toEqual(['p2']);
  });
});
