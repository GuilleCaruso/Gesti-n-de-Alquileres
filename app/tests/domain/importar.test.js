import { describe, expect, test } from 'vitest';
import { adivinarMapeo, armarImportacion, normalizarFecha, normalizarMonto, normalizarTipoAumento, parseCSV, proximaDesde, separarNombre } from '../../src/domain/importar.js';

describe('lectura del CSV', () => {
  test('detecta punto y coma, comillas y saltos de línea', () => {
    const r = parseCSV('﻿Contrato;Inquilino;Obs\r\n0154;"Pérez; Juan";"línea 1\nlínea 2"\r\n\r\n0155;Gómez;\r\n');
    expect(r.encabezados).toEqual(['Contrato', 'Inquilino', 'Obs']);
    expect(r.filas).toEqual([['0154', 'Pérez; Juan', 'línea 1\nlínea 2'], ['0155', 'Gómez', '']]);
  });
  test('también con comas', () => {
    expect(parseCSV('a,b\n1,2').filas).toEqual([['1', '2']]);
  });
});

describe('montos y fechas en formato argentino', () => {
  test('montos', () => {
    expect(normalizarMonto('$ 650.000,00')).toBe(650000);
    expect(normalizarMonto('650.000')).toBe(650000);
    expect(normalizarMonto('650000')).toBe(650000);
    expect(normalizarMonto('1.250.500,50')).toBe(1250500.5);
    expect(normalizarMonto('650,000.00')).toBe(650000);
    expect(normalizarMonto('')).toBe(0);
  });
  test('fechas', () => {
    expect(normalizarFecha('01/03/2025')).toBe('2025-03-01');
    expect(normalizarFecha('1/3/25')).toBe('2025-03-01');
    expect(normalizarFecha('2025-03-01')).toBe('2025-03-01');
    expect(normalizarFecha('45717')).toBe('2025-03-01');
    expect(normalizarFecha('marzo')).toBe(null);
  });
  test('tipo de aumento', () => {
    expect(normalizarTipoAumento('ICL Banco Central')).toEqual({ tipoAumento: 'ICL' });
    expect(normalizarTipoAumento('10% semestral')).toEqual({ tipoAumento: 'Fijo', pctFijo: 10 });
    expect(normalizarTipoAumento('')).toEqual({ tipoAumento: 'ICL' });
  });
  test('nombres', () => {
    expect(separarNombre('Pérez, Juan Carlos')).toEqual({ apellido: 'Pérez', nombre: 'Juan Carlos' });
    expect(separarNombre('Juan Carlos Pérez', 'nombre-apellido')).toEqual({ nombre: 'Juan Carlos', apellido: 'Pérez' });
    expect(separarNombre('Pérez Juan', 'apellido-nombre')).toEqual({ apellido: 'Pérez', nombre: 'Juan' });
  });
  test('próxima actualización calculada desde el inicio', () => {
    expect(proximaDesde('2025-03-01', 3, '2026-11-07')).toBe('2026-12-01');
  });
});

describe('mapeo de columnas', () => {
  test('adivina por el título, lo específico primero', () => {
    const m = adivinarMapeo(['Nro Contrato', 'Domicilio inmueble', 'Propietario', 'Inquilino', 'DNI Inquilino', 'Fecha inicio', 'Fecha fin', 'Alquiler actual']);
    expect(m).toMatchObject({ numero: 0, direccion: 1, propNombre: 2, inqNombre: 3, inqDni: 4, inicio: 5, fin: 6, alquiler: 7 });
  });
});

describe('armar importación', () => {
  let n = 0;
  const generarId = (col) => `${col}-${++n}`;
  const encabezados = ['Contrato', 'Direccion', 'Localidad', 'Propietario', 'DNI propietario', 'Inquilino', 'DNI inquilino', 'Inicio', 'Fin', 'Alquiler', 'Ajuste'];
  const mapeo = adivinarMapeo(encabezados);
  const filas = [
    ['0154', 'Belgrano 1234', 'Paso del Rey', 'Suárez, Elena', '22.556.990', 'Fernández, Juan', '34221887', '01/03/2025', '28/02/2027', '$ 610.000', 'ICL'],
    ['0151', 'Sarmiento 342', 'Paso del Rey', 'Suárez, Elena', '22556990', 'Acosta, Martín', '', '01/02/2025', '31/01/2027', '560.000', 'IPC'],
    ['0099', 'Colón 690', 'Moreno', 'Díaz, Roberto', '', 'Benítez, Hugo', '', '01/04/2022', '31/03/2024', '300.000', ''],
    ['', 'Sin datos', '', '', '', '', '', '', '', '', ''],
  ];
  const existentes = { personas: [{ id: 'yaExiste', nombre: 'Martín', apellido: 'Acosta', dni: '' }], propiedades: [], contratos: [{ numero: '0999' }] };
  const r = armarImportacion({ filas, mapeo, formatoNombre: 'nombre-apellido', existentes, generarId, hoy: '2026-11-07' });

  test('no duplica al mismo propietario de dos contratos (mismo DNI con y sin puntos)', () => {
    expect(r.personas.filter((p) => p.data.apellido === 'Suárez')).toHaveLength(1);
  });
  test('reutiliza personas que ya estaban cargadas', () => {
    expect(r.contratos[1].data.tenantId).toBe('yaExiste');
  });
  test('contrato vencido entra como Finalizado, con aviso', () => {
    expect(r.contratos[2].data.estado).toBe('Finalizado');
    expect(r.avisos.some((a) => a.fila === 4 && a.msg.includes('Finalizado'))).toBe(true);
  });
  test('una fila sin datos obligatorios va a errores y no se importa', () => {
    expect(r.errores).toEqual([{ fila: 5, msg: expect.stringContaining('Falta') }]);
    expect(r.contratos).toHaveLength(3);
  });
  test('montos, honorarios por defecto y próxima actualización', () => {
    expect(r.contratos[0].data).toMatchObject({ numero: '0154', alquilerActual: 610000, tipoAumento: 'ICL', honorarios: { tipo: 'porcentaje', valor: 5 }, proxAct: '2026-12-01' });
  });
});
