# Plan de pruebas — Experiencias Administrador y Ciudadano

## 1. Objetivo

Validar de punta a punta los circuitos de Administración y Portal Ciudadano, incluyendo el impacto cruzado de altas, ediciones, inscripciones, cambios de horarios, cancelaciones, bajas, documentación, clases, asistencias, notificaciones y credenciales QR.

Este documento está pensado como checklist de regresión. Cada ejecución debe registrar:

- Fecha y ambiente.
- Versión o commit probado.
- Navegador, sistema operativo y resolución.
- Usuario utilizado.
- Resultado: `OK`, `ERROR` o `BLOQUEADO`.
- Evidencia y número de incidencia cuando corresponda.

## 2. Criterios generales

En todos los casos validar además:

- Que durante la carga inicial solamente aparezca el cargando de página completa.
- Que no se rendericen títulos, filtros o datos parciales antes de finalizar la carga.
- Que títulos, iconos, fuentes, botones, controles, tarjetas, badges y espaciados respeten el patrón visual compartido.
- Que los paneles con contenido extenso tengan encabezado fijo y scroll interno con el estilo institucional.
- Que los estados de error sean comprensibles y no expongan detalles técnicos.
- Que una operación no se ejecute dos veces por doble clic.
- Que las fechas y horas se muestren en formato local y sin desplazamientos por zona horaria.
- Que las notificaciones y datos se actualicen sin requerir cerrar sesión.
- Que un usuario sin permiso no vea la opción ni pueda ingresar escribiendo la URL.
- Que no aparezcan caracteres dañados como `Ã`, `Â` o símbolos incorrectos.

## 3. Datos mínimos para la prueba

Preparar datos exclusivos de QA, evitando modificar información real:

- Un administrador con permisos completos.
- Un administrador con permisos limitados.
- Dos ciudadanos activos, uno con avatar y otro sin avatar.
- Un ciudadano pendiente, uno inactivo y uno rechazado.
- Un usuario de personal con rol Profesor y perfil profesional completo.
- Dos establecimientos activos.
- Una categoría, un público objetivo, un requisito documental y un recurso físico activos.
- Una actividad con cupo disponible.
- Una actividad completa con lista de espera habilitada.
- Una actividad con varios días y horarios.
- Una actividad sin clases futuras generadas.
- Una inscripción confirmada, una pendiente, una en espera y una cancelada.

## 4. Experiencia Administrador

### 4.1 Acceso, sesión y permisos

- [ ] **ADM-AUTH-01 — Ingreso administrativo válido.** Iniciar sesión con un administrador activo. Debe abrir la experiencia Administración y conservarla al refrescar.
- [ ] **ADM-AUTH-02 — Selección de experiencia.** Si el usuario posee más de un rol, elegir Administración, cerrar sesión e ingresar nuevamente. La experiencia elegida debe respetar las reglas de selección vigentes.
- [ ] **ADM-AUTH-03 — Usuario sin permiso.** Ingresar con permisos limitados. El menú debe ocultar módulos no autorizados y sus rutas deben responder con acceso denegado.
- [ ] **ADM-AUTH-04 — Sesión expirada.** Vencer o eliminar la sesión y ejecutar una acción. Debe redirigir al ingreso sin guardar parcialmente la operación.

### 4.2 Parámetros generales

- [ ] **ADM-PAR-01 — Consulta.** Abrir Parámetros generales y verificar paginado, collage y paletas por experiencia.
- [ ] **ADM-PAR-02 — Paginado.** Cambiar la cantidad global, guardar y abrir listados administrativos. Deben usar el nuevo valor.
- [ ] **ADM-PAR-03 — Imágenes del login.** Cargar cuatro imágenes válidas, guardar y abrir el login. Debe mostrar las imágenes persistidas.
- [ ] **ADM-PAR-04 — Validación de imágenes.** Probar archivo inválido, tamaño excedido y error de carga. No debe reemplazar la imagen anterior.
- [ ] **ADM-PAR-05 — Paleta por experiencia.** Modificar un color de cada experiencia y guardar. Cada portal debe aplicar únicamente su paleta.
- [ ] **ADM-PAR-06 — Restaurar paleta.** Restaurar una experiencia. Las demás paletas no deben modificarse.
- [ ] **ADM-PAR-07 — Persistencia.** Refrescar y volver a iniciar sesión. Los parámetros deben conservarse.

### 4.3 Ciudadanos: alta, borrador, edición y estado

- [ ] **ADM-CIU-01 — Alta completa válida.** Crear un ciudadano con datos personales, credenciales, domicilio, contacto, cobertura e imágenes. Debe aparecer en el listado y poder iniciar sesión.
- [ ] **ADM-CIU-02 — Alta por pasos.** Completar cada paso y guardar. El indicador debe mostrar check válido, error o paso pendiente según corresponda.
- [ ] **ADM-CIU-03 — Formulario completo.** Cambiar a Formulario completo. No deben aparecer los controles de revisión por pasos.
- [ ] **ADM-CIU-04 — Guardar borrador.** Completar parcialmente, guardar como borrador y salir. Debe poder retomarse sin perder información.
- [ ] **ADM-CIU-05 — Validaciones obligatorias.** Omitir nombre, apellido, DNI, usuario, email o contraseña. Debe impedir el guardado final e identificar el campo.
- [ ] **ADM-CIU-06 — Duplicados.** Intentar crear ciudadanos con DNI, email o User ID existentes. Debe rechazarlos con mensajes claros.
- [ ] **ADM-CIU-07 — Edición diferencial.** Modificar únicamente teléfono o domicilio. No debe alterar rol, inscripciones, clases, documentos ni QR.
- [ ] **ADM-CIU-08 — Cambio de contraseña.** Asignar una nueva contraseña y verificar que la anterior deje de funcionar y la nueva permita ingresar.
- [ ] **ADM-CIU-09 — Avatar e identidad.** Cambiar avatar y foto de identidad. Deben persistir en sus usos correspondientes sin intercambiarse.
- [ ] **ADM-CIU-10 — Activar/inactivar.** Inactivar un ciudadano y comprobar que no pueda iniciar sesión ni inscribirse. Reactivarlo y verificar recuperación del acceso.
- [ ] **ADM-CIU-11 — Panel de detalle.** Seleccionar un ciudadano con mucha información. El encabezado debe quedar fijo y solamente los datos deben hacer scroll.
- [ ] **ADM-CIU-12 — Búsqueda y paginado.** Buscar por nombre, apellido, DNI, email y usuario; combinar filtros y cambiar de página sin perder el criterio.

### 4.4 Personal, roles y profesores

- [ ] **ADM-PER-01 — Alta de personal.** Crear personal con un rol interno. Debe aparecer solamente en Personal, no en Ciudadanos.
- [ ] **ADM-PER-02 — Profesor integrado.** Crear personal con rol Profesor cargando matrícula, especialidad y descripción. Debe quedar disponible para asignar a actividades.
- [ ] **ADM-PER-03 — Edición de profesor.** Modificar sus datos profesionales. Las asignaciones existentes deben conservarse.
- [ ] **ADM-PER-04 — Cambio de rol.** Cambiar un rol y validar menú, experiencia y permisos en el siguiente ingreso.
- [ ] **ADM-PER-05 — Roles y permisos.** Crear o editar un rol, asignar permisos y comprobar visualización y acceso real a cada ruta.
- [ ] **ADM-PER-06 — Inactivación con relaciones.** Inactivar un profesor asignado. El sistema debe impedir inconsistencias o informar el impacto antes de confirmar.

### 4.5 Catálogos y establecimientos

Repetir el patrón en Categorías, Dirigido a, Requisitos, Obras sociales, Recursos físicos y Establecimientos:

- [ ] **ADM-CAT-01 — Alta válida.** Crear un registro con todos sus campos y verificar que quede disponible en los formularios relacionados.
- [ ] **ADM-CAT-02 — Validaciones.** Probar campos vacíos, nombres duplicados, formatos inválidos y límites numéricos.
- [ ] **ADM-CAT-03 — Edición.** Modificar descripción o datos informativos. Las relaciones existentes deben conservarse.
- [ ] **ADM-CAT-04 — Baja/inactivación sin uso.** Inactivar un registro no utilizado. Debe dejar de ofrecerse para nuevas operaciones.
- [ ] **ADM-CAT-05 — Baja con uso.** Intentar inactivar o eliminar un registro relacionado. Debe proteger la integridad y explicar el impedimento o efecto.
- [ ] **ADM-CAT-06 — Listado y detalle.** Validar búsqueda, filtros, tamaño de tarjetas, selección, scroll interno y paginado.
- [ ] **ADM-EST-01 — Establecimiento.** Crear y editar dirección, contacto y horarios de apertura. Debe estar disponible en actividades.
- [ ] **ADM-EST-02 — Scroll de detalle.** Con información extensa, el panel derecho debe scrollear internamente y conservar su encabezado.
- [ ] **ADM-REC-01 — Recurso y sede.** Asociar un recurso a una sede y validar que no pueda reservarse desde otra sede incompatible.

### 4.6 Actividades: ciclo completo

- [ ] **ADM-ACT-01 — Alta en borrador.** Iniciar una actividad, guardar borrador y retomarla desde el listado.
- [ ] **ADM-ACT-02 — Indicadores del workflow.** Verificar check, error y pendiente en cada paso.
- [ ] **ADM-ACT-03 — Formulario completo.** Alternar entre vistas sin perder valores; en vista completa no deben mostrarse controles de revisión.
- [ ] **ADM-ACT-04 — Información.** Cargar nombre, categoría, descripción, imagen, nivel, gratuidad o precio.
- [ ] **ADM-ACT-05 — Modalidades.** Probar horario fijo, turno recurrente, turno puntual, acceso libre, evento único y curso con período.
- [ ] **ADM-ACT-06 — Varios días y horarios.** Crear una actividad con diferentes días/franjas. Deben generarse reglas independientes.
- [ ] **ADM-ACT-07 — Cupo y lista de espera.** Configurar cupo, sobrecupo y lista de espera; validar límites y valores negativos.
- [ ] **ADM-ACT-08 — Profesor sin conflicto.** Asignar un profesor disponible y publicar.
- [ ] **ADM-ACT-09 — Profesor superpuesto.** Asignar al mismo profesor en horarios incompatibles. Debe impedirlo e informar el conflicto.
- [ ] **ADM-ACT-10 — Recursos.** Reservar un recurso disponible y probar conflicto de capacidad o superposición.
- [ ] **ADM-ACT-11 — Público objetivo.** Verificar límites de edad y género desde un ciudadano que cumple y otro que no.
- [ ] **ADM-ACT-12 — Requisitos.** Asociar requisitos obligatorios y opcionales; deben mostrarse en la experiencia ciudadana.
- [ ] **ADM-ACT-13 — Publicación.** Publicar sin pendientes. Debe aparecer en el catálogo ciudadano con días, horarios, sede y cupos correctos.
- [ ] **ADM-ACT-14 — Publicación inválida.** Intentar publicar con un paso obligatorio incompleto. Debe bloquearla y señalar el paso.
- [ ] **ADM-ACT-15 — Edición informativa.** Cambiar nombre, descripción o imagen. No debe regenerar horarios, clases, cupos ni inscripciones.
- [ ] **ADM-ACT-16 — Edición estructural.** Cambiar días u horarios. Debe afectar solamente la programación futura según la regla de negocio y conservar el historial.
- [ ] **ADM-ACT-17 — Desactivar actividad.** Debe dejar de ofrecer nuevas inscripciones sin borrar historial ni inscripciones existentes.
- [ ] **ADM-ACT-18 — Descartar borrador.** Eliminar un borrador sin publicar. No debe crear horarios, clases ni relaciones operativas.

### 4.7 Inscripciones administrativas

- [ ] **ADM-INS-01 — Alta confirmada.** Inscribir un ciudadano en una clase con cupo. Debe quedar confirmada y descontar disponibilidad.
- [ ] **ADM-INS-02 — Múltiples días.** Seleccionar varios días/horarios válidos y confirmar una sola vez. Deben persistir todos los seleccionados.
- [ ] **ADM-INS-03 — Duplicado exacto.** Intentar inscribir dos veces a la misma persona en la misma actividad, día y horario. Debe impedirlo.
- [ ] **ADM-INS-04 — Misma actividad, otro horario.** Inscribir a la misma persona en otro día u horario sin conflicto. Debe permitirlo.
- [ ] **ADM-INS-05 — Conflicto cruzado.** Elegir otra actividad que se superpone en día y hora. Debe bloquearla durante la verificación de disponibilidad.
- [ ] **ADM-INS-06 — Lista de espera.** Completar el cupo e inscribir otra persona. Debe ingresar a espera si está habilitada.
- [ ] **ADM-INS-07 — Sin lista de espera.** Con cupo completo y espera deshabilitada, no debe permitir confirmar.
- [ ] **ADM-INS-08 — Editar horarios.** Cambiar días u horarios de una inscripción existente. Debe aplicar las mismas validaciones del alta.
- [ ] **ADM-INS-09 — Identificación.** La pantalla de edición debe mostrar claramente actividad y ciudadano afectado.
- [ ] **ADM-INS-10 — Notificación por cambio.** Tras modificar horarios, el ciudadano debe recibir una notificación con el detalle correcto.
- [ ] **ADM-INS-11 — Cancelar.** Cancelar una inscripción. Debe conservar el registro histórico, liberar cupo y notificar.
- [ ] **ADM-INS-12 — Dar de baja.** Ejecutar la baja administrativa cuando esté disponible. Debe distinguirse de cancelar y conservar auditoría y motivo.
- [ ] **ADM-INS-13 — Promoción de espera.** Liberar un cupo con lista de espera. La primera persona debe promocionarse una sola vez y recibir notificación.
- [ ] **ADM-INS-14 — Avatar.** Si el ciudadano tiene avatar, debe mostrarse en listado y detalle; sin avatar debe aparecer el fallback compartido.
- [ ] **ADM-INS-15 — Listado.** Las tarjetas deben tener el mismo tamaño que Ciudadanos y mostrar solamente la información indispensable.

### 4.8 Clases y asistencias

- [ ] **ADM-CLA-01 — Generación.** Publicar una actividad con período. Deben generarse las fechas esperadas, sin duplicados.
- [ ] **ADM-CLA-02 — Próximas clases.** Las clases futuras deben aparecer para todos los ciudadanos confirmados en sus horarios.
- [ ] **ADM-CLA-03 — Suspender.** Suspender una clase con motivo. Debe conservarse, cambiar de estado y notificar a inscriptos.
- [ ] **ADM-CLA-04 — Cancelar clase.** Cancelar definitivamente. No debe aparecer como clase disponible ni confundirse con baja de inscripción.
- [ ] **ADM-CLA-05 — Finalizar.** Finalizar una clase dictada. Debe conservar historial y habilitar la lectura de asistencia.
- [ ] **ADM-ASI-01 — Planilla abierta.** Marcar presente, ausente y justificada; exigir motivo para justificada.
- [ ] **ADM-ASI-02 — Guardado.** Guardar y refrescar. Los estados deben persistir sin duplicarse.
- [ ] **ADM-ASI-03 — Cierre.** Cerrar planilla con personas sin marcar. Deben quedar ausentes según la regla informada.
- [ ] **ADM-ASI-04 — Reapertura.** Reabrir con permiso, corregir y registrar motivo cuando corresponda.
- [ ] **ADM-ASI-05 — Clase inválida.** No permitir asistencia sobre clase suspendida, cancelada o fuera del alcance del usuario.

### 4.9 Documentación

- [ ] **ADM-DOC-01 — Consulta.** Buscar documentos por ciudadano, requisito y estado.
- [ ] **ADM-DOC-02 — Carga administrativa.** Adjuntar un documento válido para un ciudadano y verificar vista previa.
- [ ] **ADM-DOC-03 — Archivo inválido.** Rechazar formato o tamaño no permitido sin perder el documento anterior.
- [ ] **ADM-DOC-04 — Aprobar.** Aprobar y comprobar cambio de estado en Administrador y Ciudadano.
- [ ] **ADM-DOC-05 — Rechazar.** Rechazar con observación obligatoria. El ciudadano debe ver el motivo y poder reemplazarlo.
- [ ] **ADM-DOC-06 — Vigencia.** Validar documento vigente, próximo a vencer y vencido según su configuración.
- [ ] **ADM-DOC-07 — Scroll y tarjetas.** El panel derecho debe usar scroll interno; las tarjetas izquierdas deben respetar el patrón de Ciudadanos.

### 4.10 Notificaciones, auditoría y reportes

- [ ] **ADM-NOT-01 — Recibidas/enviadas.** Cambiar el filtro sin recargar ni dejar un recuadro visual en la opción inactiva.
- [ ] **ADM-NOT-02 — Envío.** Enviar una notificación y comprobar destinatario, título truncado, fecha, estado y contenido.
- [ ] **ADM-NOT-03 — Lectura.** Marcar como leída y validar contador superior.
- [ ] **ADM-AUD-01 — Auditoría.** Verificar registros de altas, ediciones, bajas, cambios de estado y parámetros generales con actor y fecha.
- [ ] **ADM-REP-01 — Filtros.** Filtrar dashboard/reportes por período, actividad y establecimiento.
- [ ] **ADM-REP-02 — Tendencia.** El gráfico de área de inscripciones debe coincidir con los registros del período.
- [ ] **ADM-REP-03 — Capacidad por clase.** El gráfico debe mostrar hasta diez clases/horarios con ocupados y disponibles correctos.
- [ ] **ADM-REP-04 — Tooltip.** Posicionarse sobre cada punto. Debe mostrar nombre completo, día, horario y valores.
- [ ] **ADM-REP-05 — Sin datos.** Aplicar un período sin información. Debe mostrarse el estado vacío, no un gráfico roto.

## 5. Experiencia Ciudadano

### 5.1 Solicitud de acceso e ingreso

- [ ] **CIU-AUTH-01 — Solicitud válida.** Completar todos los datos y enviar. Debe quedar pendiente de aprobación.
- [ ] **CIU-AUTH-02 — Solicitud incompleta.** Omitir campos obligatorios o usar formatos inválidos. Debe impedir el envío.
- [ ] **CIU-AUTH-03 — Duplicados.** Probar DNI, email o usuario ya existentes. Debe informar el conflicto sin crear otra cuenta.
- [ ] **CIU-AUTH-04 — Estado pendiente.** Consultar estado e intentar ingresar antes de la aprobación. No debe acceder al portal.
- [ ] **CIU-AUTH-05 — Rechazo y reenvío.** Rechazar desde Administración, ver motivo como ciudadano, corregir y reenviar.
- [ ] **CIU-AUTH-06 — Aprobación.** Aprobar desde Administración e iniciar sesión. Debe ingresar al Portal Ciudadano.
- [ ] **CIU-AUTH-07 — Recuperación.** Solicitar cambio de contraseña y verificar token válido, vencido y reutilizado.

### 5.2 Mi perfil

- [ ] **CIU-PER-01 — Visualización.** Datos personales, acceso, domicilio, contacto, cobertura e imágenes deben usar el mismo patrón que Editar ciudadano.
- [ ] **CIU-PER-02 — Edición válida.** Cambiar dirección, localidad, provincia, código postal, teléfono y cobertura. Debe persistir.
- [ ] **CIU-PER-03 — Campos protegidos.** Verificar qué campos no puede modificar el ciudadano y que tampoco puedan alterarse manipulando la solicitud.
- [ ] **CIU-PER-04 — Contraseña.** Cambiar contraseña. El botón debe mantener el estilo primario; la contraseña anterior debe dejar de funcionar.
- [ ] **CIU-PER-05 — Avatar.** Cambiar avatar y verificar actualización en sidebar y encabezados.
- [ ] **CIU-PER-06 — Responsive.** En pantalla chica no debe haber controles fuera de tarjetas ni contenedores anidados incorrectamente.

### 5.3 Actividades e inscripción

- [ ] **CIU-ACT-01 — Catálogo.** Buscar y filtrar actividades; validar título, imagen, categoría, precio/gratuidad y estado.
- [ ] **CIU-ACT-02 — Detalle.** Ver descripción, nivel, sede, profesores, requisitos, días y horarios.
- [ ] **CIU-ACT-03 — Días disponibles.** Mostrar nombres completos en escritorio y abreviaturas en pantallas chicas.
- [ ] **CIU-INS-01 — Selección múltiple.** Marcar varios días/horarios y abrir una única pantalla de confirmación.
- [ ] **CIU-INS-02 — Confirmaciones.** Aceptar condiciones y nivel informado. Sin checks obligatorios, el botón debe permanecer deshabilitado.
- [ ] **CIU-INS-03 — Spinner.** Al continuar debe mostrarse “Inscribiendo” o equivalente e impedir doble envío.
- [ ] **CIU-INS-04 — Cupo disponible.** Confirmar y verificar estado confirmado, cupo descontado y notificación administrativa.
- [ ] **CIU-INS-05 — Lista de espera.** Inscribirse sin cupo; debe informar lista de espera y posición cuando corresponda.
- [ ] **CIU-INS-06 — Mismo horario.** Intentar inscribirse nuevamente en la misma actividad, día y horario. Debe bloquearse.
- [ ] **CIU-INS-07 — Otro día de la misma actividad.** Seleccionar otro día/horario sin conflicto. Debe permitirse.
- [ ] **CIU-INS-08 — Conflicto con otra actividad.** Elegir una franja ocupada por otra inscripción activa. Debe marcarse en rojo y no permitir confirmarla.
- [ ] **CIU-INS-09 — Persistencia visual.** Volver al detalle. Los días y horarios inscriptos deben permanecer marcados.
- [ ] **CIU-INS-10 — Requisitos.** Una inscripción con documentación faltante debe quedar en el estado definido e indicar qué debe presentar.

### 5.4 Mis inscripciones: cambios, cancelación y baja

- [ ] **CIU-MIS-01 — Listado.** Mostrar imagen de actividad, estado y resumen de horarios: por ejemplo `Lun, Mié, Vie · 13:00 a 14:00`.
- [ ] **CIU-MIS-02 — Detalle.** Validar actividad, establecimiento, horarios, requisitos y estado.
- [ ] **CIU-MIS-03 — Cambiar horarios.** Abrir la pantalla propia, no un modal. El título debe incluir el nombre de la actividad.
- [ ] **CIU-MIS-04 — Validación de disponibilidad.** Al elegir un horario, mostrar verificación y los mismos controles visuales del alta.
- [ ] **CIU-MIS-05 — Cambio válido.** Guardar otro día/horario. Debe reflejarse en Mis inscripciones, detalle de actividad y Próximas clases.
- [ ] **CIU-MIS-06 — Cambio con conflicto.** Debe bloquearse sin perder la selección anterior.
- [ ] **CIU-MIS-07 — Cancelación voluntaria.** Cancelar y confirmar. Debe conservar el historial, liberar cupo y desaparecer de próximas clases activas.
- [ ] **CIU-MIS-08 — Promoción cruzada.** Si había lista de espera, verificar que otra persona sea promovida y notificada.
- [ ] **CIU-MIS-09 — Reintento.** Intentar cancelar nuevamente o reutilizar la petición. No debe duplicar efectos.

### 5.5 Próximas clases y asistencias

- [ ] **CIU-AGE-01 — Todas las actividades.** Un ciudadano con Yoga, Pilates y otra actividad debe ver las clases futuras de todas, no solamente una.
- [ ] **CIU-AGE-02 — Todos los horarios.** Una inscripción con varios días debe generar entradas para cada horario confirmado.
- [ ] **CIU-AGE-03 — Calendario/listado.** Alternar vistas sin perder mes, selección ni filtros.
- [ ] **CIU-AGE-04 — Navegación mensual.** Avanzar y retroceder meses; el encabezado debe ser legible y mantener el estilo visual.
- [ ] **CIU-AGE-05 — Clase suspendida/cancelada.** Debe mostrar el estado correcto o dejar de considerarla próxima según la regla definida.
- [ ] **CIU-AGE-06 — Sin clases generadas.** Mostrar estado vacío informativo aunque exista una inscripción confirmada.
- [ ] **CIU-ASI-01 — Historial.** Ver presente, ausente y justificada con fecha, actividad y horario correctos.
- [ ] **CIU-ASI-02 — Actualización.** Registrar o corregir asistencia desde Administración y comprobar el cambio en Ciudadano.

### 5.6 Mis documentos

- [ ] **CIU-DOC-01 — Listado.** Debe usar el patrón visual de Documentos de ciudadanos y mostrar estado/vigencia.
- [ ] **CIU-DOC-02 — Carga.** Adjuntar documento válido y verificar progreso, confirmación y persistencia.
- [ ] **CIU-DOC-03 — Reemplazo rechazado.** Reemplazar un documento rechazado; debe volver al estado de revisión correspondiente.
- [ ] **CIU-DOC-04 — Error de archivo.** Probar tipo, tamaño y carga interrumpida. Debe conservar el documento previo.
- [ ] **CIU-DOC-05 — Aprobación cruzada.** Aprobar desde Administración y verificar actualización en Ciudadano.

### 5.7 Mi QR y notificaciones

- [ ] **CIU-QR-01 — Emisión.** Emitir credencial y comprobar código, estado y diseño.
- [ ] **CIU-QR-02 — Persistencia.** Refrescar y volver a ingresar. Debe conservarse la credencial activa.
- [ ] **CIU-QR-03 — Revocación.** Revocar y verificar que deje de funcionar en recepción/asistencia.
- [ ] **CIU-QR-04 — Reemisión.** Emitir otra credencial. La anterior debe continuar inválida.
- [ ] **CIU-NOT-01 — Alta de inscripción.** Verificar notificación de confirmación o lista de espera.
- [ ] **CIU-NOT-02 — Cambio administrativo.** Recibir detalle cuando Administración modifica una clase u horario.
- [ ] **CIU-NOT-03 — Suspensión/cancelación.** Recibir aviso de clase suspendida o cancelada.
- [ ] **CIU-NOT-04 — Lectura.** Abrir, marcar leída y verificar contador.
- [ ] **CIU-NOT-05 — Tarjetas.** Título largo truncado con puntos suspensivos, badge visible y tamaño equivalente a Ciudadanos.

## 6. Pruebas cruzadas Administrador ↔ Ciudadano

### 6.1 Alta y acceso

- [ ] **CRU-01.** Ciudadano solicita acceso → Administrador recibe pendiente → rechaza con motivo → Ciudadano corrige → Administrador aprueba → Ciudadano ingresa.
- [ ] **CRU-02.** Administrador crea ciudadano activo → Ciudadano ingresa → edita datos permitidos → Administrador visualiza los cambios.
- [ ] **CRU-03.** Administrador inactiva al ciudadano durante una sesión → la siguiente operación protegida debe quedar bloqueada.

### 6.2 Actividad e inscripción

- [ ] **CRU-04.** Administrador publica actividad con tres horarios → Ciudadano visualiza los tres → elige dos → Administrador ve ambos asociados.
- [ ] **CRU-05.** Ciudadano se inscribe → cupo baja en Administrador → inscripción aparece en ambos portales → Administrador recibe notificación.
- [ ] **CRU-06.** Administrador cambia el horario de la inscripción → Ciudadano recibe notificación → Mis inscripciones y Próximas clases muestran el nuevo horario.
- [ ] **CRU-07.** Ciudadano cambia su horario → Administrador visualiza la modificación y recibe la notificación prevista.
- [ ] **CRU-08.** Ciudadano cancela → cupo se libera → Administrador ve el estado histórico → la clase desaparece de la agenda activa del ciudadano.
- [ ] **CRU-09.** Cupo completo con espera → Ciudadano A cancela → Ciudadano B es promovido → ambos estados y notificaciones son correctos.
- [ ] **CRU-10.** Administrador suspende una fecha → todos los ciudadanos afectados reciben una sola notificación.

### 6.3 Documentos, asistencia y QR

- [ ] **CRU-11.** Ciudadano carga documento → Administrador lo rechaza → Ciudadano ve motivo y reemplaza → Administrador aprueba → estado final coincide.
- [ ] **CRU-12.** Administrador registra asistencia → Ciudadano ve el resultado en su historial.
- [ ] **CRU-13.** Ciudadano presenta QR activo → sistema valida identidad e inscripción. Revocar el QR y repetir: debe rechazarse.
- [ ] **CRU-14.** Cancelar o dar de baja una inscripción y luego intentar registrar asistencia o ingreso para ese horario. Debe bloquearse.

## 7. Regresión visual y responsive

Ejecutar las pantallas principales en anchos aproximados de `1440`, `1024`, `768`, `390` y `360` píxeles:

- [ ] Sidebar completo, reducido y móvil sin contenido cortado.
- [ ] Formularios por pasos con sidebar más angosto y texto contenido dentro de las tarjetas.
- [ ] Listados de dos columnas sin scroll general innecesario.
- [ ] Tarjetas izquierdas con tamaño, fuente y espaciado equivalentes al patrón de Ciudadanos.
- [ ] Paneles derechos con encabezado fijo y scroll interno visible.
- [ ] Botones de acción accesibles después del último control.
- [ ] Gráficos responsivos, tooltips legibles y estados vacíos correctos.
- [ ] Días completos en escritorio y abreviados en pantallas chicas.
- [ ] Títulos largos truncados sin desplazar badges.
- [ ] Modales permitidos dentro de pantalla; flujos principales de confirmación y cambio en rutas propias cuando así estén definidos.

## 8. Cierre de la ejecución

Antes de aprobar la versión:

- [ ] No existen incidencias críticas o bloqueantes abiertas.
- [ ] Todas las altas, ediciones, cancelaciones y bajas conservan auditoría e historial.
- [ ] No hay duplicados de usuarios, inscripciones, clases, asistencias o notificaciones.
- [ ] Los cupos coinciden entre actividad, inscripción, dashboard y reporte.
- [ ] Las próximas clases coinciden con todos los horarios confirmados del ciudadano.
- [ ] Los cambios realizados desde una experiencia se reflejan correctamente en la otra.
- [ ] Los permisos fueron probados desde UI y acceso directo por URL/API.
- [ ] Se adjuntaron evidencias de los circuitos cruzados principales.

