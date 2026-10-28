# Caruso Propiedades — app real

Versión real del sistema, construida a partir del prototipo aprobado (`../caruso-propiedades.html`).
Reglas obligatorias: `../PROJECT_RULES.md`. Decisiones e historial: `../notas.md`.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/domain/` | Reglas de negocio puras (honorarios, arreglos, liquidaciones, permisos, formatos). Sin base de datos. |
| `src/services/` | Acceso a Firebase (sesión, usuarios y, en las próximas etapas, cada módulo). |
| `src/ui/` | Pantallas. Estilos tomados del prototipo. |
| `tests/domain/` | Pruebas de las reglas de negocio. |
| `tests/rules/` | Pruebas de las reglas de seguridad (`../firestore.rules`) contra el emulador. |
| `tests/e2e/` | Prueba de punta a punta en el navegador contra los emuladores. |

## Comandos

```
npm install
npm test             # reglas de negocio
npm run test:rules   # seguridad (requiere Java)
npm run test:e2e     # punta a punta (requiere Java y Chromium)
VITE_EMULADOR=1 npm run dev   # app local contra emuladores
npm run build        # genera dist/ para Firebase Hosting
```

## Datos en Firestore

| Colección | Contenido | Quién la ve |
|---|---|---|
| `usuarios/{uid}` | nombre, email, rol (`admin` / `empleado`), activo | Cada uno el suyo; el administrador, todos |
| `personas`, `propiedades`, `contratos`, `pagos`, `arreglos`, `serviciosPagados`, `deudasServicios`, `liquidaciones` | Operación diaria | Usuarios activos |
| `cuentas/{id}` | nombre, efectivo, soloAdmin, saldoInicial | Empleado: solo las que no son `soloAdmin` |
| `movimientos/{id}` | cuentaId, tipo, monto, soloAdmin (copiado de la cuenta), creadoPor, anulado | Empleado: solo `soloAdmin == false` (las consultas deben filtrar por ese campo) |
| `config/indices` | ICL e IPC del mes | Usuarios activos |

Nada con historia se borra: se marca `anulado` (PROJECT_RULES, regla 12).

## Pendiente de Guillermo para publicar

1. `src/firebase-config.js`: completar `firebaseConfig` y `ADMIN_INICIAL_UID`.
2. `../firestore.rules`: reemplazar `PENDIENTE_UID_ADMIN` por el mismo UID.
3. `../.firebaserc`: poner el ID real del proyecto.
4. Secreto `FIREBASE_SERVICE_ACCOUNT` en GitHub.

Importante: los links de vista previa usan la misma base de datos que la app publicada. Antes de importar datos reales hay que crear un segundo proyecto de Firebase para pruebas.
