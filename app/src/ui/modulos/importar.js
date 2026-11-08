// Importar datos (solo administrador): CSV → asignar columnas → vista previa con errores → importar.
import { esc, fdate, money } from '../../domain/formato.js';
import { adivinarMapeo, armarImportacion, CAMPOS, parseCSV } from '../../domain/importar.js';
import { guardarLote, nuevoId } from '../../services/datos.js';
import { aviso, confirmar, hoyIso } from '../base.js';
import { icon } from '../icons.js';

// estado de la pantalla mientras se importa (no va a la base hasta confirmar)
let archivo = null; // {nombre, encabezados, filas}
let mapeo = {};
let formatoNombre = 'nombre-apellido';

function resultado(d) {
  if (!archivo) return null;
  let n = 0;
  return armarImportacion({ filas: archivo.filas, mapeo, formatoNombre, existentes: d, generarId: (col) => `${col}-previa-${++n}`, hoy: hoyIso() });
}

export function vista({ d }) {
  const r = resultado(d);
  const paso1 = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:6px;">1. Elegí el archivo</div>
      <div class="page-sub" style="margin-bottom:12px;">Exportá los contratos de Arcomercial a Excel y guardalo como <b>CSV</b> (Archivo → Guardar como → "CSV UTF-8"). Una fila por contrato, con su propiedad, propietario e inquilino.</div>
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
        <input type="file" id="impArchivo" accept=".csv,.txt">
        ${archivo ? `<span class="badge badge-ok">${icon('check')}${esc(archivo.nombre)} · ${archivo.filas.length} filas</span>` : ''}
      </div>
    </div>`;
  if (!archivo) return cabecera() + paso1;
  const opciones = (k) => `<option value="">— no está —</option>` + archivo.encabezados.map((h, i) => `<option value="${i}" ${mapeo[k] === i ? 'selected' : ''}>${esc(h || 'Columna ' + (i + 1))}</option>`).join('');
  const ejemplo = (k) => (mapeo[k] != null && archivo.filas[0] ? esc(archivo.filas[0][mapeo[k]] || '') : '');
  const paso2 = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:6px;">2. Revisá qué columna es cada dato</div>
      <div class="page-sub" style="margin-bottom:12px;">La app propone las columnas por el título. Corregí las que estén mal. Los marcados con * son obligatorios.</div>
      <div class="field" style="max-width:340px; margin-bottom:14px;"><label for="impFormato">Los nombres sin coma vienen como</label>
        <select id="impFormato"><option value="nombre-apellido" ${formatoNombre === 'nombre-apellido' ? 'selected' : ''}>Nombre Apellido (Juan Pérez)</option><option value="apellido-nombre" ${formatoNombre === 'apellido-nombre' ? 'selected' : ''}>Apellido Nombre (Pérez Juan)</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Dato</th><th>Columna del archivo</th><th>Ejemplo (fila 2)</th></tr></thead><tbody>
        ${CAMPOS.map((c) => `<tr><td class="cell-title">${esc(c.l)}${c.req ? ' *' : ''}</td><td><select data-mapeo="${c.k}">${opciones(c.k)}</select></td><td class="cell-sub">${ejemplo(c.k)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  const nuevosC = r.contratos;
  const paso3 = `
    <div class="card card-pad">
      <div class="section-title" style="margin-bottom:10px;">3. Vista previa</div>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);">
        <div class="stat-tile"><div class="stat-value tnum">${nuevosC.length}</div><div class="stat-label">Contratos a importar</div></div>
        <div class="stat-tile"><div class="stat-value tnum">${r.propiedades.length}</div><div class="stat-label">Propiedades nuevas</div></div>
        <div class="stat-tile"><div class="stat-value tnum">${r.personas.length}</div><div class="stat-label">Personas nuevas</div></div>
        <div class="stat-tile"><div class="stat-value tnum" style="color:var(--${r.errores.length ? 'danger' : 'ok'}-600);">${r.errores.length}</div><div class="stat-label">Filas con error (no se importan)</div></div>
      </div>
      ${r.errores.length ? `<div class="note-banner" style="margin-bottom:10px;">${icon('alert')}<div>${r.errores.slice(0, 15).map((e) => `Fila ${e.fila}: ${esc(e.msg)}`).join('<br>')}${r.errores.length > 15 ? `<br>…y ${r.errores.length - 15} más` : ''}</div></div>` : ''}
      ${r.avisos.length ? `<div class="note-banner info" style="margin-bottom:10px;">${icon('alert')}<div>${r.avisos.slice(0, 10).map((e) => `Fila ${e.fila}: ${esc(e.msg)}`).join('<br>')}${r.avisos.length > 10 ? `<br>…y ${r.avisos.length - 10} avisos más` : ''}</div></div>` : ''}
      ${nuevosC.length ? `<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>N°</th><th>Inicio</th><th>Fin</th><th class="num">Alquiler</th><th>Aumento</th><th>Próx. act.</th><th>Estado</th></tr></thead><tbody>
        ${nuevosC.slice(0, 8).map(({ data: c }) => `<tr><td>${esc(c.numero || '—')}</td><td>${fdate(c.inicio)}</td><td>${fdate(c.fin)}</td><td class="num">${money(c.alquilerActual)}</td><td>${esc(c.tipoAumento)}${c.pctFijo ? ' ' + c.pctFijo + '%' : ''} · ${c.frecuencia}m</td><td>${fdate(c.proxAct)}</td><td>${esc(c.estado)}</td></tr>`).join('')}
      </tbody></table></div><div class="page-sub" style="margin-bottom:14px;">Primeros ${Math.min(8, nuevosC.length)} de ${nuevosC.length}. Revisá que montos y fechas se vean bien antes de importar.</div>` : ''}
      <div style="display:flex; gap:10px;">
        <button class="btn" data-accion="importar-cancelar">Cancelar</button>
        <button class="btn btn-primary" data-accion="importar-confirmar" ${nuevosC.length ? '' : 'disabled'}>${icon('check')}Importar ${nuevosC.length} contratos</button>
      </div>
    </div>`;
  return cabecera() + paso1 + paso2 + paso3;
}

const cabecera = () => `<div class="page-head"><div><h1 class="page-title">Importar datos</h1><div class="page-sub">Carga masiva de contratos, propiedades y personas desde Arcomercial (o cualquier planilla)</div></div></div>`;

// se conecta después de dibujar: el selector de archivo y los desplegables
export function montar() {
  const input = document.getElementById('impArchivo');
  if (input) input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    let texto = await f.text();
    // archivos de Excel viejos vienen en Windows-1252: si hay caracteres rotos, se relee
    if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(await f.arrayBuffer());
    const { encabezados, filas } = parseCSV(texto);
    if (!encabezados.length || !filas.length) { aviso('El archivo está vacío o no es un CSV'); return; }
    archivo = { nombre: f.name, encabezados, filas };
    mapeo = adivinarMapeo(encabezados);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  document.querySelectorAll('[data-mapeo]').forEach((sel) => {
    sel.onchange = () => { mapeo[sel.dataset.mapeo] = sel.value === '' ? undefined : Number(sel.value); window.dispatchEvent(new HashChangeEvent('hashchange')); };
  });
  const fmt = document.getElementById('impFormato');
  if (fmt) fmt.onchange = () => { formatoNombre = fmt.value; window.dispatchEvent(new HashChangeEvent('hashchange')); };
}

export const acciones = {
  'importar-cancelar': () => { archivo = null; mapeo = {}; window.dispatchEvent(new HashChangeEvent('hashchange')); },
  'importar-confirmar': ({ d }) => {
    const r = armarImportacion({ filas: archivo.filas, mapeo, formatoNombre, existentes: d, generarId: nuevoId, hoy: hoyIso() });
    confirmar(`Se van a crear ${r.contratos.length} contratos, ${r.propiedades.length} propiedades y ${r.personas.length} personas. ${r.errores.length} filas con error quedan afuera. ¿Importar?`, async () => {
      const items = [
        ...r.personas.map((x) => ({ coleccion: 'personas', ...x })),
        ...r.propiedades.map((x) => ({ coleccion: 'propiedades', ...x })),
        ...r.contratos.map((x) => ({ coleccion: 'contratos', ...x })),
      ];
      try {
        aviso('Importando…');
        await guardarLote(items);
        archivo = null; mapeo = {};
        aviso(`Listo: ${r.contratos.length} contratos importados`);
        location.hash = '#/contratos';
      } catch (e) {
        console.error(e);
        aviso('Falló la importación. Revisá la conexión; lo ya guardado queda cargado.');
      }
    });
  },
};
