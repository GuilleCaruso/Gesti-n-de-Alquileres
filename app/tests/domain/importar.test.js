import { describe, expect, test } from 'vitest';
import { adivinarMapeo, armarImportacion, normalizarFecha, normalizarFrecuencia, normalizarMonto, normalizarTipoAumento, parseCSV, proximaDesde, separarNombre, nombrePropio, armarActualizacion, CAMPOS_ACT, planillaContratos } from '../../src/domain/importar.js';

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
  test('frecuencia: cuatrimestral no se confunde con trimestral', () => {
    expect(normalizarFrecuencia('Cuatrimestral')).toBe(4);
    expect(normalizarFrecuencia('trimestral')).toBe(3);
    expect(normalizarFrecuencia('Semestral')).toBe(6);
    expect(normalizarFrecuencia('6')).toBe(6);
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

describe('columnas que se parecen', () => {
  test('"Próxima actualización" no se confunde con el tipo de ajuste', () => {
    const m = adivinarMapeo(['Ajuste', 'Periodicidad', 'Proxima actualizacion']);
    expect(m).toMatchObject({ tipoAumento: 0, frecuencia: 1, proxAct: 2 });
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
  const r = armarImportacion({ filas, mapeo, formatoNombre: 'nombre-apellido', existentes, generarId, hoy: '2026-11-07', incluirVencidos: true });

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

describe('planilla de Arcomercial (contratos_todos2.xlsx)', () => {
  const encabezados = ['Carpeta', 'Indice', 'Inicio de Contrato', 'Fin de Contrato', 'Dirección', 'Inquilino', 'Celular Inq.', 'Propietario', 'Celular Prop.', 'Monto actual'];
  const mapeo = adivinarMapeo(encabezados);
  test('reconoce cada columna', () => {
    expect(mapeo).toMatchObject({ numero: 0, tipoAumento: 1, inicio: 2, fin: 3, direccion: 4, inqNombre: 5, inqTel: 6, propNombre: 7, propTel: 8, alquiler: 9 });
    expect(mapeo.frecuencia).toBeUndefined();
  });
  let n = 0;
  const filas = [
    ['472', 'IPC', '01/03/2026', '28/02/2028', 'ASCONAPE 120', 'ALBESA MARIA / LUQUE JUAN', '11 5555-1111', 'D´ANGELO VICENTE', '11 5555-2222', '696000'],
    ['473', 'ICL (Banco Central)', '01/06/2025', '31/05/2027', 'ASCONAPE 120', 'PEREZ ANA', '', 'D´ANGELO VICENTE / GOMEZ LUIS', '', '500000'],
    ['472', 'IPC', '01/03/2026', '28/02/2028', 'ASCONAPE 120', 'ALBESA MARIA', '', 'D´ANGELO VICENTE', '', '696000'],
    ['300', 'ICL', '01/01/2022', '31/12/2023', 'VIEJA 1', 'X', '', 'Y', '', '0'],
    ['301', 'ICL', '01/01/2026', '31/12/2027', 'NUEVA 1', 'X', '', 'Y', '', '0'],
    ['302', 'ICL', '01/01/2026', '31/12/2027', 'NUEVA 2', 'X', '', 'Y', '', '1'],
  ];
  const r = armarImportacion({ filas, mapeo, formatoNombre: 'apellido-nombre', existentes: { personas: [], propiedades: [], contratos: [] }, generarId: (c) => `${c}-${++n}`, hoy: '2026-11-08', frecuenciaDefecto: 4, incluirVencidos: true });
  test('nombres en mayúsculas pasan a nombre propio', () => {
    expect(nombrePropio('D´ANGELO VICENTE')).toBe('D´Angelo Vicente');
    expect(nombrePropio('Pérez Juan')).toBe('Pérez Juan');
    expect(r.personas.find((p) => p.data.apellido === 'Albesa').data.nombre).toBe('Maria');
  });
  test('"/" en inquilinos: dos inquilinos; en propietarios: el primero y el resto a observaciones', () => {
    const c = r.contratos[0].data;
    expect(r.personas.find((p) => p.id === c.tenantId2).data.apellido).toBe('Luque');
    expect(r.contratos[1].data.obs).toContain('Copropietarios: Gomez Luis');
    expect(r.personas.filter((p) => p.data.apellido === 'D´Angelo')).toHaveLength(1);
  });
  test('misma dirección con dos contratos vigentes: dos propiedades, con aviso', () => {
    expect(r.contratos[0].data.propertyId).not.toBe(r.contratos[1].data.propertyId);
    expect(r.avisos.some((a) => a.msg.includes('otra propiedad'))).toBe(true);
  });
  test('carpeta repetida: se importa una sola vez', () => {
    expect(r.contratos.filter((c) => c.data.numero === '472')).toHaveLength(1);
  });
  test('monto en cero: el terminado entra como historial, el vigente va a errores mostrando lo que dice', () => {
    expect(r.contratos.find((c) => c.data.numero === '300').data.estado).toBe('Finalizado');
    expect(r.errores).toEqual([{ fila: 6, msg: expect.stringContaining('N° 301 con alquiler en cero o no reconocido (dice "0")') }]);
  });
  test('monto sospechoso ($1): entra con aviso', () => {
    expect(r.avisos.some((a) => a.fila === 7 && a.msg.includes('revisá el monto'))).toBe(true);
  });
  test('sin frecuencia: usa la elegida y marca "Revisar aumento"', () => {
    expect(r.contratos[0].data).toMatchObject({ numero: '472', tipoAumento: 'IPC', frecuencia: 4, revisarAumento: true, proxAct: '2027-03-01' });
    expect(r.contratos[1].data.tipoAumento).toBe('ICL');
    expect(r.avisos[0].msg).toContain('Revisar aumento');
  });
});

describe('renovaciones y vencidos', () => {
  const encabezados = ['Carpeta', 'Indice', 'Inicio de Contrato', 'Fin de Contrato', 'Dirección', 'Inquilino', 'Propietario', 'Monto actual'];
  const mapeo = adivinarMapeo(encabezados);
  const filas = [
    ['76', 'IPC', '01/04/2024', '31/03/2026', 'BELGRANO 1', 'CAJES STELLA', 'DUEÑO UNO', '0.00'],
    ['76', 'IPC', '01/04/2026', '31/03/2028', 'BELGRANO 1', 'CAJES STELLA', 'DUEÑO UNO', '630000'],
    ['90', 'ICL', '01/01/2022', '31/12/2023', 'COLON 5', 'VIEJO INQ', 'DUEÑO DOS', '100000'],
  ];
  let n = 0;
  const armar = (incluirVencidos) => armarImportacion({ filas, mapeo, formatoNombre: 'apellido-nombre', existentes: { personas: [], propiedades: [], contratos: [] }, generarId: (c) => `${c}-${++n}`, hoy: '2026-11-08', incluirVencidos });
  test('misma carpeta renovada: se importa el contrato más reciente, aunque esté segundo', () => {
    const r = armar(false);
    expect(r.contratos).toHaveLength(1);
    expect(r.contratos[0].data).toMatchObject({ numero: '76', inicio: '2026-04-01', alquilerActual: 630000, estado: 'Activo' });
    expect(r.avisos.some((a) => a.fila === 2 && a.msg.includes('renovación'))).toBe(true);
  });
  test('por defecto los vencidos no se importan (ni sus personas ni propiedades)', () => {
    const r = armar(false);
    expect(r.propiedades).toHaveLength(1);
    expect(r.personas.some((p) => p.data.apellido === 'Viejo')).toBe(false);
    expect(r.avisos.some((a) => a.msg.includes('1 contrato(s) ya vencidos no se importan'))).toBe(true);
  });
  test('tildando "incluir vencidos" entran como Finalizado', () => {
    const r = armar(true);
    expect(r.contratos.find((c) => c.data.numero === '90').data.estado).toBe('Finalizado');
  });
});

describe('actualizar contratos ya cargados (planilla de 4 columnas)', () => {
  const encabezados = ['N°carpeta/contrato', 'Monto actual', 'Última actualización', 'Tipo de aumento: IPC,ICL, %, Personalizado'];
  const mapeo = adivinarMapeo(encabezados, CAMPOS_ACT);
  const contratos = [
    { id: 'a', numero: '76', estado: 'Activo', alquilerActual: 1, tipoAumento: 'ICL', frecuencia: 3, proxAct: '2027-01-01', revisarAumento: true },
    { id: 'viejo', numero: '76', estado: 'Finalizado', alquilerActual: 0, tipoAumento: 'ICL', frecuencia: 3, proxAct: '2024-01-01' },
    { id: 'b', numero: '85', estado: 'Activo', alquilerActual: 500000, tipoAumento: 'Fijo', pctFijo: 8, frecuencia: 6, proxAct: '2027-01-01' },
    { id: 'c', numero: '90', estado: 'Activo', alquilerActual: 300000, tipoAumento: 'IPC', frecuencia: 3, proxAct: '2026-12-01' },
  ];
  const filas = [
    ['76', '630.000', '01/09/2026', 'IPC'],
    ['85', '', '01/08/2026', '%'],
    ['90', '300000', '', 'IPC'],
    ['999', '1000', '', ''],
    ['91', '', '', '%'],
  ];
  const r = armarActualizacion({ filas, mapeo, contratos: [...contratos, { id: 'd', numero: '91', estado: 'Activo', tipoAumento: 'ICL', frecuencia: 3, alquilerActual: 5 }], hoy: '2026-11-10' });
  test('reconoce las 4 columnas por el título', () => {
    expect(mapeo).toMatchObject({ numero: 0, alquiler: 1, ultimaAct: 2, tipoAumento: 3 });
  });
  test('corrige monto, tipo y calcula el próximo aumento desde el último (vigente, no el viejo con la misma carpeta)', () => {
    const c = r.cambios.find((x) => x.id === 'a');
    expect(c.nuevo).toEqual({ alquilerActual: 630000, tipoAumento: 'IPC', proxAct: '2026-12-01', revisarAumento: false });
    expect(c.antes.alquilerActual).toBe(1);
  });
  test('"%" solo mantiene el porcentaje que ya tenía y usa su frecuencia', () => {
    expect(r.cambios.find((x) => x.id === 'b').nuevo).toEqual({ proxAct: '2027-02-01' });
  });
  test('fila sin cambios no genera nada', () => {
    expect(r.cambios.find((x) => x.id === 'c')).toBeUndefined();
  });
  test('N° inexistente y % sin número van a errores', () => {
    expect(r.errores.map((e) => e.fila)).toEqual([5, 6]);
  });
  test('planilla para completar: CSV con BOM y separador ;', () => {
    const csv = planillaContratos(contratos, [], []);
    expect(csv.startsWith('\uFEFFN° carpeta;')).toBe(true);
    expect(csv).toContain('85;;;500000;Pesos;;8%;6');
    expect(csv).not.toContain('2024');
  });
});

describe('actualizar sin "última actualización": calcula el próximo aumento desde el inicio', () => {
  const mapeo = adivinarMapeo(['N° carpeta', 'Monto actual', 'Última actualización', 'Tipo de aumento'], CAMPOS_ACT);
  const contratos = [
    { id: 'a', numero: '1', estado: 'Activo', inicio: '2025-08-01', alquilerActual: 100, tipoAumento: 'ICL', frecuencia: 3, proxAct: '2026-11-01', revisarAumento: true },
    { id: 'b', numero: '2', estado: 'Activo', inicio: '2025-08-20', alquilerActual: 100, tipoAumento: 'ICL', frecuencia: 3, proxAct: '2026-11-20', revisarAumento: true },
    { id: 'c', numero: '3', estado: 'Activo', inicio: '2025-09-15', alquilerActual: 100, tipoAumento: 'IPC', frecuencia: 3, proxAct: '2026-12-15', revisarAumento: true },
  ];
  const filas = [['1', '', '', ''], ['2', '', '', ''], ['3', '', '', '']];
  const armar = (sinFecha) => Object.fromEntries(armarActualizacion({ filas, mapeo, contratos, hoy: '2026-11-11', sinFecha }).cambios.map((c) => [c.id, c.nuevo]));
  test('con los aumentos del mes ya aplicados: el próximo cae después de este mes', () => {
    expect(armar('inicio-mes-aplicado')).toEqual({
      a: { proxAct: '2027-02-01', revisarAumento: false },
      b: { proxAct: '2027-02-20', revisarAumento: false },
      c: { revisarAumento: false },
    });
  });
  test('sin esa aclaración: el del 20/11, que todavía no llegó, queda pendiente para este mes', () => {
    expect(armar('inicio')).toEqual({ a: { proxAct: '2027-02-01', revisarAumento: false }, b: { revisarAumento: false }, c: { revisarAumento: false } });
  });
  test('"no tocar": no cambia nada', () => {
    expect(armar('no')).toEqual({});
  });
  test('si la fila trae la fecha del último aumento, manda esa', () => {
    const r = armarActualizacion({ filas: [['1', '', '01/10/2026', '']], mapeo, contratos, hoy: '2026-11-11', sinFecha: 'inicio-mes-aplicado' });
    expect(r.cambios[0].nuevo.proxAct).toBe('2027-01-01');
  });
});
