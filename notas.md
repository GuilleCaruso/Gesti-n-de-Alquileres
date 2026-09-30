# Notas del proyecto – Caruso Propiedades

Bitácora de lo que vamos trabajando. Se actualiza en cada sesión.

## Archivos del repo

| Archivo | Qué es |
|---|---|
| `caruso-propiedades.html` | **Versión actual** de la app (la que venía del chat anterior). Un solo archivo HTML, sin dependencias externas salvo Google Fonts. |
| `index.html` | Versión vieja (Tailwind + Firebase + jsPDF). Queda como referencia, no se sigue desarrollando por ahora. |
| `notas.md` | Este archivo. |

## Estado actual de `caruso-propiedades.html` (30/09/2026)

Secciones: Inicio (dashboard) · Propiedades (con ficha) · Personas · Contratos · Cobranzas (con recibo y monto en letras) · Aumentos/actualizaciones · Deudores · Arreglos · Servicios · Liquidaciones a propietarios · Configuración.

Funciones clave ya hechas: cobrar / deshacer pago, generar recibo, actualizar contratos (individual y todos los pendientes), agregar garante, deudas y pagos de servicios, cálculo de deudores, liquidación por propietario, links a WhatsApp.

### Limitaciones detectadas

- **Los datos están escritos dentro del código** (`persons`, `properties`, `contracts`, `payments`, etc.). No hay base de datos ni guardado: todo lo que se carga o cobra **se pierde al recargar la página**. Es un prototipo, no una herramienta usable en el día a día todavía.

## Contexto del chat anterior

- Guillermo es hijo del martillero; el objetivo es modernizar la inmobiliaria familiar. Hace un año intentó hacer la app con ChatGPT + Cursor y no llegó a terminarla.
- Base del proyecto: informe **"Recordar app inmobiliaria.pdf"** (hecho con ChatGPT) con módulos, entidades, reglas de negocio y flujo mensual. **Ese PDF todavía no está en este repo.**
- Plan en etapas definido en el informe:
  1. **Etapa 1 – Prototipo navegable** con datos ficticios, sin base de datos. Sirve para validar diseño y funcionalidades. ← estamos acá.
  2. **Etapa 2 – Arquitectura definitiva** y proyecto real (carpetas, base de datos) para seguir con Cursor.
- Primera versión del prototipo: 9 pantallas (Dashboard, Propiedades con ficha por pestañas, Personas, Contratos, Cobranzas, Deudores, Servicios, Liquidaciones, Configuración). Datos: 16 propiedades, 17 personas, 10 contratos (ICL / IPC / % fijo / personalizado; cada 3/4/6 meses), cobranzas de 3 meses con todos los estados.
- La versión que está en el repo ya tiene más cosas que esa primera versión (Arreglos, Aumentos, recibos, garantes, deudas de servicios). O sea, hubo más iteraciones que no quedaron en la transcripción.

## Decisiones tomadas

- Primero el prototipo visual, después la arquitectura real.
- Identidad visual: **verde inglés + naranja** tomados del logo de Caruso Propiedades. Hoy el sidebar muestra un emblema simplificado; falta reemplazarlo por el logo real.
- Deudores **se calculan** a partir de las cobranzas (no es una lista aparte).
- Liquidaciones **se calculan** a partir de lo cobrado.
- Búsqueda global (propiedades y personas) en la barra superior.

## Pendientes / próximos pasos

- [x] Cargar el contexto del chat anterior (parcial: la transcripción corta en la primera versión).
- [ ] Subir al repo el PDF "Recordar app inmobiliaria.pdf" y el logo en imagen.
- [ ] Recorrer el prototipo pantalla por pantalla y anotar ajustes.
- [ ] Definir cómo se guardan los datos (sin esto la app no sirve para uso real).

## Historial

- **30/09/2026** – Se carga el contexto del chat anterior en estas notas.
- **30/09/2026** – Se sube `caruso-propiedades.html` al repo y se crea `notas.md`.
