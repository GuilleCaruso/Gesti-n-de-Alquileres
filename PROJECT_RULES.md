# Reglas del proyecto — Sistema de gestión Caruso Propiedades

Estas reglas las tiene que respetar cualquier persona o agente de IA (Claude, Cursor u otro) que modifique la app. Si una tarea choca con una regla, se frena y se consulta a Guillermo antes de seguir.

## 1. Funcionalidad

1. No eliminar ni cambiar una funcionalidad existente sin autorización explícita de Guillermo.
2. No modificar módulos que no tengan relación con la tarea pedida.
3. La búsqueda global (dirección, localidad, tipo, propietario, inquilino, ID) es crítica y se mantiene siempre.
4. La impresión (recibos, recibos del mes, ficha, liquidaciones) es crítica y se mantiene siempre.
5. Toda acción importante tiene "Deshacer" o confirmación.
6. La interfaz prioriza PC, pero tiene que poder usarse en celular.
7. No agregar botones, pantallas ni opciones "por si algún día sirven".

## 2. Datos

8. No duplicar información: una persona existe una sola vez (con uno o más roles); los contratos, cobros y liquidaciones la referencian por ID.
9. Los deudores **se calculan** desde las cobranzas; no existe una lista paralela de deudores.
10. Las liquidaciones **se calculan** desde lo cobrado, los honorarios del contrato, los arreglos y los servicios.
11. Los movimientos de caja se generan desde las operaciones (cobro, pago de liquidación, pago a especialista, servicio pagado). No se cargan dos veces.
12. Nada se borra físicamente de la base si tiene historia (contratos, cobros, movimientos): se anula o se da de baja, y queda registrado quién y cuándo.

## 3. Seguridad y permisos

13. Roles: **Administrador** y **Empleado**.
14. El Empleado **no puede ver**: caja grande, total general de cajas y bancos, total de honorarios del mes, ni el resumen del administrador.
15. El Empleado **no puede** registrar pagos desde efectivo (caja chica o grande). Cobra en efectivo o transferencia; paga y transfiere desde bancos o Mercado Pago.
16. Los permisos se aplican en la base de datos (políticas de seguridad por fila), no solo escondiendo pantallas.
17. Nunca subir al repositorio contraseñas, claves secretas ni datos personales reales (DNI, teléfonos) de clientes.

## 4. Reglas de negocio confirmadas

18. Contratos con N° interno editable y único; aparece en recibos y planillas.
19. Actualización de alquiler por contrato: ICL, IPC, porcentaje fijo o personalizado; cada 3, 4, 6 o 12 meses; con historial.
20. Honorarios por contrato: porcentaje (habitual 5%) o monto fijo mensual. Se calculan sobre lo que se liquida al propietario: si expensas o servicios no van a la liquidación, no se cobran honorarios sobre ellos.
21. Recibos sin duplicado. Recibos del mes por el importe completo, dos por hoja A4.
22. Arreglos: Pendiente → En curso → Arreglado → Pagado. "Arreglado" = terminado y ya pagado al especialista por la inmobiliaria. Si paga el propietario, se descuenta en la liquidación del mes si todavía no se le pagó; si ya se le pagó, en la del mes siguiente. Pasa a "Pagado" cuando esa liquidación se marca pagada.
23. No se administran propiedades en venta.
24. No se cargan gastos de la oficina en Caja.

## 5. Forma de trabajar

25. Separar interfaz, lógica de negocio y acceso a datos. Nada de un único archivo gigante.
26. Antes de refactorizar, analizar dependencias y explicar qué se va a tocar.
27. Cambios chicos y de a uno; cada cambio se prueba antes de subirlo.
28. Toda modificación se prueba contra las funcionalidades existentes (pruebas automáticas cuando existan).
29. Cada cambio se trabaja en una rama, se revisa en el link de vista previa y recién después se pasa a producción.
30. Las decisiones nuevas se anotan en `notas.md`.
