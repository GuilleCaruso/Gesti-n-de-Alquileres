# Notas del proyecto – Caruso Propiedades

Bitácora de lo que vamos trabajando. Se actualiza en cada sesión.

## Archivos del repo

| Archivo | Qué es |
|---|---|
| `caruso-propiedades.html` | **Versión actual** de la app (la que venía del chat anterior). Un solo archivo HTML, sin dependencias externas salvo Google Fonts. |
| `index.html` | Versión vieja (Tailwind + Firebase + jsPDF). Queda como referencia, no se sigue desarrollando por ahora. |
| `notas.md` | Este archivo. |
| `app/` | **App real** (Etapa 1 en curso): Vite + JavaScript + Firebase. Ver `app/README.md`. |
| `firestore.rules` | Reglas de seguridad de la base (roles, caja grande, nada se borra). |
| `.github/workflows/firebase.yml` | Pruebas y publicación automática en Firebase. |
| `PROJECT_RULES.md` | Reglas que tiene que respetar cualquier persona o IA que modifique la app. |
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

- Primera puesta en marcha (07/11/2026): solo lo que usan de Arcomercial — contratos/propiedades/personas, aumentos con aviso y recibos con cobro simple. Liquidaciones, deudores, arreglos y caja quedan para después.
- Aumentos: rigen desde la fecha de "próxima actualización"; cada mes cobra el alquiler vigente en ese mes. Sugerido redondeado a $500 (ej.: 655.750 → 656.000), siempre editable.

- App real: **Firebase** (decidido 28/10/2026; Supabase descartado por costo). Firestore + Authentication + Hosting. Spark gratis; Blaze (~US$ 0-1/mes, alerta US$ 5) recién con datos reales, para archivos y copias de seguridad. Construcción con Claude Code en 9 etapas, cada una aprobada en un link de vista previa. Mes de prueba en paralelo con el sistema actual antes del cambio.

- Arreglos: etapas **Pendiente → En curso → Arreglado → Pagado** (En curso confirmado). El costo se puede cargar o cambiar en cualquier momento.
  - **Arreglado** = terminado y ya se le pagó al especialista (se registra la fecha). Requiere costo y quién paga.
  - Si paga el propietario: se descuenta en la liquidación del mes del arreglo si todavía no se le pagó al propietario; si ya se le pagó, en la del mes siguiente (ej.: arreglado el 8/9 → septiembre, o octubre si septiembre ya se pagó).
  - Las liquidaciones se marcan **"pagadas al propietario"**; en ese momento sus arreglos pasan a **Pagado** y quedan en el historial de la propiedad.
  - Si paga el inquilino: se cierra con "Marcar cobrado al inquilino".
- Si las expensas/servicios no van al propietario, no se cobran honorarios sobre ellos.

- Honorarios: se cobran sobre todo lo abonado. Cada contrato define su esquema: porcentaje (habitual 5%, a veces 10% o 4%) o monto fijo mensual. Se descuentan de la liquidación del propietario, una línea por contrato.
- Método de trabajo: definir todo en el prototipo antes de construir la app real (acordado).

- No se administran propiedades en venta: solo alquiladas y disponibles (más reservada / en mantenimiento / baja).
- Cada contrato tiene un N° interno de la inmobiliaria, editable y único. En el recibo reemplaza al antiguo "Número".
- Expensas y servicios cobrados van por defecto a la liquidación del propietario; se pueden excluir con el tilde.

- Datos de la inmobiliaria: tel. 11 3449-8819 · info@carusopropiedades.com.
- Recibos **sin duplicado**. Individual: 1 recibo. Recibos del mes: 2 por hoja A4 con línea de corte.
- Recibos del mes por el importe completo, para firmar al cobrar (confirmado por Guillermo).
- Al cobrar: alquiler fijo (viene del contrato) + expensas y servicios opcionales y editables. Se suman al recibo y a la liquidación.

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

## Caja y bancos (05/10/2026)

- Módulo **"Caja y bancos"** dentro de la misma app (no app aparte), con selector "Ver como: Administrador / Empleado" para simular permisos.
- Cuentas: Caja chica (efectivo), Caja grande (efectivo), ICBC, Banco Provincia, Mercado Pago, BBVA.
- **Empleado:** ve saldos de caja chica y bancos; cobra en efectivo o transferencia; paga/transfiere solo desde bancos o Mercado Pago (no paga en efectivo). **No ve** caja grande, total general ni honorarios.
- **Administrador:** ve todo + recuadro con total en cajas y bancos, pendiente de liquidar a propietarios, honorarios del mes (ganancia) y adelantado en arreglos.
- Se registran solos: cobros (eligiendo medio de pago), pago de liquidaciones (eligiendo cuenta), pago al especialista al marcar un arreglo "Arreglado" (la inmobiliaria adelanta y lo recupera en la liquidación o cobrándoselo al inquilino), servicios pagados. Además: movimientos manuales y transferencias entre cuentas.
- No se cargan gastos de la oficina (decisión de Guillermo).
- En la app real la restricción va en la base de datos/servidor, no solo en la pantalla.

## Pendientes / próximos pasos

- [x] Cargar el contexto del chat anterior (parcial: la transcripción corta en la primera versión).
- [x] Subir al repo el PDF y el logo.
- [x] Poner el logo real en la barra lateral.
- [x] Logo en recibos e impresiones.
- [x] Impresiones: recibo, recibos del mes con planilla de control, ficha de propiedad, liquidación (individual y todas).
- [x] Teléfono y mail reales en impresos y Configuración.
- [x] Al cobrar se pueden cargar expensas y servicios.
- [x] Tilde "Sumar a la liquidación del propietario" para expensas y servicios (por defecto tildado).
- [x] N° de contrato interno editable; aparece en recibos, planilla, contratos y ficha impresa.
- [x] Altas funcionando: nueva propiedad, nueva persona, registrar arreglo (desde Arreglos y desde la ficha).
- [x] Se quitó "En venta" de Propiedades.
- [x] Honorarios por contrato: % (5% por defecto) o monto fijo mensual; editable en la ficha y al crear el contrato.
- [x] Honorarios sobre expensas/servicios destildados: no se cobran (confirmado).
- [x] Arreglos editables (costo, especialista, quién paga, etapa) y con etapas Pendiente → En curso → Arreglado → Pagado.
- [x] Crear `PROJECT_RULES.md`.
- [x] Instructivo para pasar a la app real: https://claude.ai/artifact/8BrSCNonPDZ1tgXFGoCjUw
- [x] Decisiones: Firebase; 3 usuarios (Guillermo admin + 2 empleados); datos se exportan de Arcomercial; dominio lo administra el hermano.
- [x] Etapa 1 (código): ingreso, roles, gestión de usuarios, menú por rol, reglas de seguridad, lógica de negocio portada, publicación automática. Pruebas: 21 de negocio, 25 de seguridad, 12 de punta a punta.
- [ ] Guillermo: Paso 1 del instructivo (crear proyecto Firebase, Firestore en São Paulo, login email/contraseña, su usuario, app web, secreto en GitHub) y pasar `firebaseConfig` + su User UID.
- [x] **Reemplazo de Arcomercial (lo que usan: recibos y avisos de aumento)** programado y probado: personas, propiedades (ficha con pestañas), contratos (N° interno, garante, honorarios, expensas, próxima actualización), aumentos (índices, actualizar individual/masivo con deshacer, WhatsApp, nota impresa), cobros simples (expensas, servicios, parcial, medio de pago), recibo individual y recibos del mes con planilla, buscador global, importador CSV con mapeo de columnas. Pruebas: 48 de negocio, 25 de seguridad, 40 de punta a punta.
- [ ] Claude: enchufar firebaseConfig y UID, abrir la propuesta para publicar.
- [ ] Guillermo: exportar Arcomercial y pasar solo títulos de columnas + 1-2 filas inventadas.
- [ ] Antes de importar datos reales: segundo proyecto `caruso-app-pruebas` (las vistas previas comparten base con producción).
- [ ] Recorrer el prototipo pantalla por pantalla y anotar ajustes.
- [ ] Definir cómo se guardan los datos (sin esto la app no sirve para uso real).

## Historial
- **11/11/2026** – **Deudores** (etapa 2). Por contrato: meses anteriores con saldo y el mes actual si ya pasó el día de vencimiento; pagos parciales cuentan solo el saldo; usa el alquiler que regía en cada mes. La deuda se controla desde el mes en que se cargó el contrato (campo "Controlar deuda desde" en Editar contrato, hasta 12 meses atrás, para registrar deuda anterior). Contratos finalizados: solo lo que quedó a medio pagar. Pantalla con WhatsApp de reclamo y acceso directo a cobrar cada mes; aviso "debe N meses anteriores" en Cobranzas; Inicio muestra inquilinos con deuda. El empleado no ve la deuda total. Prioridades de Guillermo: honorarios reales pasan a la etapa 3; número correlativo de recibo importante pero no urgente.
- **11/11/2026** – Proyecto Firebase de pruebas **caruso-pruebas** (creado por Guillermo). Los pull requests compilan con VITE_ENTORNO=pruebas y publican vista previa y reglas ahí (secreto FIREBASE_SERVICE_ACCOUNT_PRUEBAS); main publica en caruso-propiedades. La app de pruebas muestra "PRUEBAS · datos de mentira" en la barra lateral. Las reglas ya no llegan a la base real antes de aprobar. adminInicial() acepta el UID de Guillermo de cada proyecto.
- **11/11/2026** – Revisión general y plan por etapas (1: blindar; 2: deudores, N° de recibo, honorarios reales; 3: liquidaciones, arreglos, caja). Etapa 1 hecha en parte: **copia de seguridad** (Configuración, solo administrador: Excel para leer + .json completo para restaurar, incluye cobros de todos los años; Inicio lo recuerda si pasaron 7 días, por computadora) y **contratos vencidos / por vencer** (aviso en Inicio, filtro en Contratos, aviso en la ficha; un contrato vencido sin finalizar ni renovar se sigue cobrando marcado hasta el mes actual, antes desaparecía de Cobranzas). Pendiente de la etapa 1: proyecto Firebase de pruebas separado (hoy la vista previa escribe en la base real y las reglas se publican en cada PR) y verificación en dos pasos en GitHub y Google.
- **10/11/2026** – Arcomercial dado de baja: la app ya opera sola; empleados con acceso. Cobro: el alquiler del mes se puede cambiar al cobrar (solo ese mes, avisa) y no deja cobrar más de lo que se debe (indica corregir alquiler o sumar en servicios). Recibo parcial: "Total del mes / Pagó ahora / Saldo pendiente"; el pago que completa dice "cancela el saldo del mes". Cada recibo certifica el último cobro, no el acumulado.
- **10/11/2026** – Importar → "Actualizar contratos ya cargados": planilla corta por N° de carpeta (monto, última actualización, tipo de aumento, frecuencia y moneda opcionales); próximo aumento = última + frecuencia; vista previa antes → después, deshacer. Botón para descargar la planilla de los contratos activos (CSV para Excel). Cobranzas con columnas N° y Propietario. WhatsApp: se elige por computadora (Configuración) si abre WhatsApp Web en Chrome (número de administración) o la app de escritorio; por defecto Web. Envío automático sin confirmar = API oficial de WhatsApp (Meta), pendiente de decidir: costo por mensaje, plantillas aprobadas, número dedicado, y un servidor (Firebase Functions, plan Blaze).
- **09/11/2026** – Importación real hecha (Guillermo: "se cargaron bien"). Empleados: en Inicio y Cobranzas ven cantidades (cobrados, por cobrar, vencidos), no totales en plata; la planilla impresa no muestra el total. Ojo: siguen viendo el importe de cada alquiler, que necesitan para cobrar. Contratos en dólares: moneda por contrato (todo el contrato en una moneda: alquiler, expensas, servicios), recibo "La suma de US$ … dólares estadounidenses", aumentos redondeados a US$ 10, totales separados "$ … + US$ …". El alquiler ahora se puede corregir desde Editar contrato (para los $1 importados); los aumentos siguen yendo por Aumentos.
- **09/11/2026** – Importador aprobado (PR #11): renovaciones con la misma carpeta toman el contrato más reciente; vencidos no se importan por defecto. Guillermo puso $1 a los vigentes que Arcomercial tenía en $0 (corregir después). Contratos en dólares: ver 09/11.
- **08/11/2026** – App publicada en caruso-propiedades.web.app (PR #10 aprobado). Importador adaptado a Arcomercial: lee el .xlsx directo (sin pasar a CSV), reconoce "Carpeta" como N° de contrato y "Celular Inq./Prop.", pasa MAYÚSCULAS a nombre propio, "A / B" en inquilino = dos inquilinos y en propietario = el primero + copropietarios en observaciones, misma dirección con dos contratos vigentes = dos propiedades (falta el depto). Arcomercial no exporta frecuencia ni próxima actualización: se elige una frecuencia por defecto al importar y los contratos quedan marcados "Revisar aumento" hasta que alguien los edite. Archivos de Arcomercial: contratos_todos2.xlsx (principal), propiedades(1).xlsx (honorarios, tipo, copropietarios con %), contratos_inquilinos (e-mails, CBU) e indexacion_masiva (solo 45 contratos, períodos sin fechas).
- **08/11/2026** – Guillermo: "es todo lo que necesitamos para operar". WhatsApp de aumento sin el monto anterior; recibo con la leyenda "Documento no válido como factura". Próximo paso: importar los contratos de Arcomercial.
- **08/11/2026** – Aumentos más seguros: redondeo a $1.000; no deja actualizar un contrato ICL/IPC sin el índice del mes cargado (antes lo "actualizaba" al mismo monto); confirmación con montos antes de aplicar; "Deshacer" del último aumento desde la ficha del contrato (cualquier usuario, en cualquier momento).
- **08/11/2026** – Primera prueba real de Guillermo ("se ve bien, anda rápido"). Cambios pedidos: fechas siempre dd/mm/aaaa (campo propio con calendario, Chrome en inglés mostraba mm/dd), fin de contrato automático a 2 años menos un día, selector de personas con búsqueda por descarte (por comienzo de nombre, apellido o DNI, sin tildes), y borrar para el administrador solo lo cargado por error: contrato sin cobros, propiedad sin contratos, persona sin vínculos (con Deshacer). Regla 12 actualizada. El alquiler del contrato es el monto vigente hoy.
- **08/11/2026** – Primera vista previa publicada. Se dieron a la cuenta de servicio los roles Administrador de Firebase, Consumidor de Service Usage y Visualizador de claves de API. Las reglas de seguridad ahora se suben también en cada PR (la vista previa comparte la base con la app definitiva; sin reglas la base rechaza todo).

- **08/11/2026** – Módulos de operación diaria de la app real listos para probar. Arcomercial se renueva mientras tanto.
- **28/10/2026** – Se elige Firebase. Etapa 1 de la app real programada y probada (falta conectar el proyecto de Guillermo).
- **28/10/2026** – Prototipo dado por cerrado. Creado `PROJECT_RULES.md` e instructivo de puesta en marcha.
- **05/10/2026** – Módulo Caja y bancos con permisos por rol (simulados).
- **03/10/2026** – Impresión se dispara en el mismo clic (antes con demora; algunos navegadores la bloqueaban). Revisión automática de todos los botones: 262 clics en pantallas + 37 pruebas de ventanas, menú, buscador e impresiones, sin errores.
- **03/10/2026** – Liquidaciones "pagadas al propietario" y regla de en qué liquidación se descuenta cada arreglo.
- **03/10/2026** – Arreglos editables con etapas y historial por propiedad.
- **03/10/2026** – Honorarios configurables por contrato (porcentaje o monto fijo).
- **01/10/2026** – Altas (propiedad, persona, arreglo), N° de contrato editable, tilde de liquidación, sin "En venta". Corregido: la X del panel de persona no cerraba.
- **01/10/2026** – Recibos sin duplicado, datos de contacto reales, expensas/servicios editables al cobrar.
- **01/10/2026** – Impresiones completas (recibo, recibos del mes, ficha, liquidaciones) y corregido texto duplicado "Arreglo — Arreglo" en liquidaciones. Publicado en el link del prototipo.
- **01/10/2026** – PDF y logo al repo; logo real en la barra lateral.
- **30/09/2026** – Se carga el contexto del chat anterior en estas notas.
- **30/09/2026** – Se sube `caruso-propiedades.html` al repo y se crea `notas.md`.
