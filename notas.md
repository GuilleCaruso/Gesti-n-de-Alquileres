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

_(Pendiente: pegar acá el resumen de lo conversado en el otro chat.)_

## Decisiones tomadas

- 

## Pendientes / próximos pasos

- [ ] Cargar el contexto del chat anterior.
- [ ] Definir cómo se guardan los datos (sin esto la app no sirve para uso real).

## Historial

- **30/09/2026** – Se sube `caruso-propiedades.html` al repo y se crea `notas.md`.
