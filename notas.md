# Notas del proyecto – Caruso Propiedades

Bitácora de lo que vamos trabajando. Se actualiza en cada sesión.

## Archivos del repo

| Archivo | Qué es |
|---|---|
| `caruso-propiedades.html` | **Versión actual** de la app (la que venía del chat anterior). Un solo archivo HTML, sin dependencias externas salvo Google Fonts. |
| `index.html` | Versión vieja (Tailwind + Firebase + jsPDF). Queda como referencia, no se sigue desarrollando por ahora. |
| `notas.md` | Este archivo. |
| `docs/recordar-app-inmobiliaria.pdf` | Informe base del proyecto (hecho con ChatGPT). Es la especificación funcional. |
| `assets/logo-caruso.png` | Logo oficial. |

## Estado actual de `caruso-propiedades.html` (30/09/2026)

Secciones: Inicio (dashboard) · Propiedades (con ficha) · Personas · Contratos · Cobranzas (con recibo y monto en letras) · Aumentos/actualizaciones · Deudores · Arreglos · Servicios · Liquidaciones a propietarios · Configuración.

Funciones clave ya hechas: cobrar / deshacer pago, generar recibo, actualizar contratos (individual y todos los pendientes), agregar garante, deudas y pagos de servicios, cálculo de deudores, liquidación por propietario, links a WhatsApp.

### Limitaciones detectadas

- **Los datos están escritos dentro del código** (`persons`, `properties`, `contracts`, `payments`, etc.). No hay base de datos ni guardado: todo lo que se carga o cobra **se pierde al recargar la página**. Es un prototipo, no una herramienta usable en el día a día todavía.

## Contexto del chat anterior

- Guillermo es hijo del martillero; el objetivo es modernizar la inmobiliaria familiar. Hace un año intentó hacer la app con ChatGPT + Cursor y no llegó a terminarla.
- Base del proyecto: informe **"Recordar app inmobiliaria.pdf"** (hecho con ChatGPT) con módulos, entidades, reglas de negocio y flujo mensual. Ya está en `docs/`.
- Plan en etapas definido en el informe:
  1. **Etapa 1 – Prototipo navegable** con datos ficticios, sin base de datos. Sirve para validar diseño y funcionalidades. ← estamos acá.
  2. **Etapa 2 – Arquitectura definitiva** y proyecto real (carpetas, base de datos) para seguir con Cursor.
- Primera versión del prototipo: 9 pantallas (Dashboard, Propiedades con ficha por pestañas, Personas, Contratos, Cobranzas, Deudores, Servicios, Liquidaciones, Configuración). Datos: 16 propiedades, 17 personas, 10 contratos (ICL / IPC / % fijo / personalizado; cada 3/4/6 meses), cobranzas de 3 meses con todos los estados.
- La versión que está en el repo ya tiene más cosas que esa primera versión (Arreglos, Aumentos, recibos, garantes, deudas de servicios). O sea, hubo más iteraciones que no quedaron en la transcripción.

## Decisiones tomadas

- Prototipo publicado en https://claude.ai/artifact/4Mbn7nLqpn2jaFfhnBsaBU (se actualiza en el mismo link).
- Recibos del mes: se imprime uno por cada alquiler del período, por el importe completo, cobrado o no. Los pendientes de actualizar se avisan antes de imprimir y figuran en la planilla de control; se puede elegir imprimir solo los listos.

- Primero el prototipo visual, después la arquitectura real.
- Identidad visual: **verde inglés + naranja** tomados del logo de Caruso Propiedades. Logo real ya incorporado en la barra lateral (01/10/2026).
- Deudores **se calculan** a partir de las cobranzas (no es una lista aparte).
- Liquidaciones **se calculan** a partir de lo cobrado.
- Búsqueda global (propiedades y personas) en la barra superior.

## Puntos clave del informe (resumen)

- ~170 alquileres activos. Uso interno, principalmente desde PC. Prioridad: rápido, claro, estable.
- **Búsqueda tipo Google** sobre dirección + localidad + tipo + propietario + inquilino + ID: funcionalidad crítica, no se puede perder.
- **Personas con roles** (propietario, inquilino, garante, etc.), sin duplicar personas.
- Un propietario puede tener **varias propiedades**; las liquidaciones se agrupan por propietario.
- Contratos con actualización flexible: ICL / IPC / % fijo / personalizado; cada 3 / 4 / 6 meses / personalizada; con historial.
- Estado **"Pendiente de actualizar"** visible (ej.: "132 actualizados / 8 pendientes").
- **Impresión** importante: recibos de todos los alquileres del mes.
- Flujo mensual: revisar actualizaciones → actualizar → generar alquileres → cobrar → deudores → recibos → liquidar.
- Prioridades: Nivel 1 = propiedades, personas, contratos, búsqueda, cobranzas, deudores, actualizaciones, impresión. Nivel 2 = liquidaciones, servicios, historial, alertas, dashboard. Nivel 3 = documentos, WhatsApp, portales, IA.
- Lo que NO hacer: HTML gigante, lógica mezclada con pantallas, duplicar datos, refactors masivos.
- Propone un archivo `PROJECT_RULES.md` con reglas para los agentes de IA (todavía no creado).

## Pendientes / próximos pasos

- [x] Cargar el contexto del chat anterior (parcial: la transcripción corta en la primera versión).
- [x] Subir al repo el PDF y el logo.
- [x] Poner el logo real en la barra lateral.
- [x] Logo en recibos e impresiones.
- [x] Impresiones: recibo (original + duplicado), recibos del mes con planilla de control, ficha de propiedad, liquidación (individual y todas).
- [ ] Confirmar formato del recibo (¿original + duplicado en una hoja A4 está bien?).
- [ ] Cargar teléfono real de la inmobiliaria (hoy dice 0237 15-XXXX-XXXX en los impresos).
- [ ] Crear `PROJECT_RULES.md` antes de la Etapa 2.
- [ ] Recorrer el prototipo pantalla por pantalla y anotar ajustes.
- [ ] Definir cómo se guardan los datos (sin esto la app no sirve para uso real).

## Historial

- **01/10/2026** – Impresiones completas (recibo, recibos del mes, ficha, liquidaciones) y corregido texto duplicado "Arreglo — Arreglo" en liquidaciones. Publicado en el link del prototipo.
- **01/10/2026** – PDF y logo al repo; logo real en la barra lateral.
- **30/09/2026** – Se carga el contexto del chat anterior en estas notas.
- **30/09/2026** – Se sube `caruso-propiedades.html` al repo y se crea `notas.md`.
