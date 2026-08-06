# Ejecución QA integral de circuitos

## Datos de la ejecución

- Fecha: 2026-08-06
- Ambiente: local conectado a Supabase
- Rama evaluada: `dev`
- Lote persistente: `qa-e2e-20260806`
- Convenciones: `OK`, `ERROR`, `BLOQUEADO`
- Todos los usuarios, establecimientos, públicos, requisitos y actividades creados contienen la nomenclatura `qa`.

## Resumen

| Estado | Cantidad |
|---|---:|
| OK | 33 |
| ERROR | 2 |
| BLOQUEADO | 0 |

## Fixtures creados

### Usuarios

| Usuario | Rol/origen | Característica | Estado |
|---|---|---|---|
| `qa-e2e-20260806-menor` | Ciudadano creado por Administración | Nacimiento 2012, masculino | ACTIVO |
| `qa-e2e-20260806-mujer` | Solicitud propia desde Ciudadano | Nacimiento 1992, femenino | ACTIVO después de aprobación |
| `qa-e2e-20260806-mayor` | Solicitud creada por Recepción | Nacimiento 1955, masculino, mayor de 60 | ACTIVO después de aprobación |
| `qa-e2e-20260806-espera` | Ciudadano auxiliar | Femenino, utilizado para cupo y cancelación | ACTIVO |
| `qa-e2e-20260806-profesor` | Profesor creado por Administración | Especialidad QA Actividades, matrícula QA | ACTIVO |
| `qa-e2e-20260806-recepcion` | Recepcionista creado por Administración | Operador de recepción | ACTIVO |

### Establecimientos

- `QA Establecimiento 1`
- `QA Establecimiento 2`

### Públicos dirigidos

| Público | Regla |
|---|---|
| QA Mujeres | Sólo género `FEMENINO` |
| QA Adultos mayores | Edad mínima 60 años |
| QA Todo público | Sin restricciones de edad o género |

### Actividades

| Actividad | Público | Horario | Cupo | Estado final |
|---|---|---|---:|---|
| QA Actividad Mujeres | QA Mujeres | Lunes 10:00–11:00 | 10 | Activa |
| QA Actividad Adultos Mayores | QA Adultos mayores | Martes 09:00–10:00 | 10 | Activa |
| QA Actividad Todo Público | QA Todo público | Lunes 10:30–11:30 | 10 | Activa |
| QA Actividad Ciber | QA Todo público | Miércoles 18:00–19:00 | 1 | Completa, con una persona en espera |

Todas poseen el requisito opcional `QA Documento de identidad`. El profesor QA quedó asignado como principal al horario de Adultos Mayores.

## Resultados funcionales

| ID | Prueba | Resultado | Evidencia |
|---|---|---|---|
| QA-USR-01 | Crear recepcionista desde Administración | OK | Usuario activo con rol `reception`. |
| QA-USR-02 | Crear profesor con perfil profesional | OK | Profesor activo, especialidad y matrícula persistidas. |
| QA-USR-03 | Crear ciudadano menor desde Administración | OK* | El alta funciona al normalizar la fecha a `Date`; ver incidencia INC-01. |
| QA-USR-04 | Crear solicitud desde Ciudadano | OK | Usuario mujer quedó inicialmente `PENDIENTE`. |
| QA-USR-05 | Aprobar solicitud ciudadana desde Administración | OK | Solicitud `APROBADA`, usuario `ACTIVO`. |
| QA-USR-06 | Crear solicitud desde Recepción | OK | Usuario mayor quedó inicialmente `PENDIENTE`. |
| QA-PERM-01 | Recepción intenta aprobar solicitud | OK funcional / ERROR técnico | La autorización fue denegada, pero el handler lanzó `FORBIDDEN` sin transformarlo en respuesta 403; ver INC-02. |
| QA-USR-07 | Administrador aprueba solicitud creada por Recepción | OK | Solicitud aprobada y usuario mayor activo. |
| QA-EST-01 | Crear dos establecimientos | OK | Ambos visibles en el selector de establecimiento de Recepción. |
| QA-PUB-01 | Configurar públicos por género, edad y alcance general | OK | Tres públicos persistidos con sus reglas. |
| QA-REQ-01 | Crear y asociar requisito | OK | Requisito documental opcional asociado a las cuatro actividades. |
| QA-ACT-01 | Crear tres actividades segmentadas y Ciber | OK | Cuatro actividades activas visibles en Administración. |
| QA-PROF-01 | Asignar profesor a actividad | OK | Una asignación persistida en el horario de Adultos Mayores. |
| QA-ENR-01 | Mujer se inscribe a actividad para mujeres | OK | Inscripción confirmada. |
| QA-ENR-02 | Menor masculino intenta ingresar a actividad para mujeres | OK | Rechazada por sexo/género. No se creó inscripción. |
| QA-ENR-03 | Mayor de 60 se inscribe a Adultos Mayores | OK | Inscripción confirmada. |
| QA-ENR-04 | Menor intenta ingresar a Adultos Mayores | OK | Rechazada por edad. No se creó inscripción. |
| QA-ENR-05 | Menor se inscribe a Todo Público | OK | Inscripción confirmada. |
| QA-ENR-06 | Mujer intenta otra actividad con horario superpuesto | OK | Rechazada por solapamiento del lunes 10:00–11:00 con 10:30–11:30. |
| QA-CAP-01 | Completar cupo de Ciber | OK | Primer usuario confirmado con cupo 1. |
| QA-CAP-02 | Inscribir con Ciber completo | OK | Segundo usuario quedó inicialmente `LISTA_ESPERA`. |
| QA-CAN-01 | Cancelar inscripción confirmada | OK | Inscripción quedó `CANCELADA`, con fecha y motivo QA. |
| QA-CAN-02 | Promoción automática de lista de espera | OK | La persona en espera pasó a `CONFIRMADA` y recibió notificación. |
| QA-CAP-03 | Mantener una persona en espera al finalizar | OK | Usuario mayor quedó `LISTA_ESPERA`, posición 1, mientras Ciber conserva cupo completo. |
| QA-ROL-01 | Inscribir mediante handler con Administrador | OK | Respuesta 201, inscripción confirmada. |
| QA-ROL-02 | Inscribir mediante handler con Recepción | OK | Respuesta 201, inscripción confirmada. |
| QA-ROL-03 | Inscribir desde circuito Ciudadano | OK | Inscripciones confirmadas y notificaciones ciudadanas/administrativas creadas. |
| QA-DOC-01 | Cargar documento desde Ciudadano | OK | `qa-ciudadano.png`, estado En revisión. |
| QA-DOC-02 | Cargar documento desde Administración | OK | `qa-administracion.png`, estado Pendiente. |
| QA-DOC-03 | Cargar documento desde Recepción | OK | `qa-recepcion.png`, estado Pendiente y notificación a revisores. |
| QA-UI-01 | Visualizar actividades en Administración | OK | Se muestran Adultos Mayores, Ciber, Mujeres y Todo Público. |
| QA-UI-02 | Visualizar inscripciones en Administración y Recepción | OK | Cards QA visibles con estados Confirmada y Cancelada, detalle, cupo y horarios. |
| QA-UI-03 | Filtrar actividades ciudadanas por elegibilidad | OK | La mujer ve Mujeres, Ciber y Todo Público; Adultos Mayores no aparece. |
| QA-UI-04 | Ver métricas y notificaciones ciudadanas | OK | Dashboard muestra dos confirmadas antes de las altas adicionales y novedades de espera/promoción. |
| QA-UI-05 | Ver documento cargado desde Ciudadano | OK | `QA Documento de identidad` muestra `qa-ciudadano.png` En revisión. |

## Rechazo de inscripción desde Recepción

| ID | Prueba | Resultado | Evidencia |
|---|---|---|---|
| QA-REC-REJ-01 | Crear una inscripción pendiente desde Recepción | OK | La API respondió 201 y persistió el estado `PENDIENTE`. |
| QA-REC-REJ-02 | Rechazar sin indicar motivo | OK | La API respondió 400 y exigió `motivoRechazo`. |
| QA-REC-REJ-03 | Rechazar indicando motivo | OK | La API respondió 200 y persistió el estado `RECHAZADA`. |
| QA-REC-REJ-04 | Verificar estado y motivo en base de datos | OK | Estado y motivo coinciden con los enviados por Recepción. |
| QA-REC-REJ-05 | Verificar auditoría | OK | Se registró la acción `RECHAZAR` con el recepcionista QA como autor. |
| QA-REC-REJ-06 | Verificar capacidad | OK | Conservó 0 confirmadas y 5 lugares disponibles; una pendiente no consume cupo. |
| QA-REC-REJ-07 | Verificar notificación ciudadana | OK después de corrección | La notificación informa el rechazo y ahora incluye el motivo. |
| QA-REC-REJ-08 | Verificar visualmente en Recepción y Ciudadano | OK | Recepción muestra estado y motivo; Ciudadano recibe el detalle completo. |

Se detectó que la notificación original omitía el motivo obligatorio del rechazo. Se corrigió la composición del mensaje y se repitió el circuito con un segundo ciudadano QA. El nuevo mensaje mostró: `Motivo: QA: falta presentar autorización vigente` tanto en base de datos como en la interfaz ciudadana.

## Estado final en tablas y métricas

| Entidad | Cantidad QA |
|---|---:|
| Usuarios | 6 |
| Establecimientos | 2 |
| Públicos objetivo | 3 |
| Actividades | 4 |
| Requisitos | 1 |
| Documentos personales | 3 |
| Inscripciones confirmadas | 6 |
| Inscripciones canceladas | 1 |
| Inscripciones en lista de espera | 1 |
| Asignaciones de profesor | 1 |
| Notificaciones a usuarios QA | 14 o más, incluyendo la última lista de espera |

Los estados de inscripción, fechas de cancelación, motivo, relaciones de horarios, documentos, públicos dirigidos, profesor y establecimientos fueron consultados nuevamente desde Prisma después de la ejecución.

## Incidencias

### INC-01 — Alta administrativa con fecha en formato de formulario

- Severidad: Alta.
- Resultado: ERROR.
- El servicio `createOrReviveUser` recibe `fechaNacimiento` como `yyyy-MM-dd` desde el schema, pero entrega ese texto directamente a Prisma.
- Prisma rechaza el valor con `Expected ISO-8601 DateTime`.
- Para continuar la batería se normalizó la fecha a `Date` exclusivamente dentro del fixture QA.
- Riesgo: el alta administrativa de usuario puede responder 500 según el camino utilizado.

### INC-02 — Aprobación rechazada para Recepción sin respuesta HTTP controlada

- Severidad: Media.
- Resultado: ERROR de contrato, aunque la seguridad funciona.
- Recepción no pudo aprobar la solicitud, que es el comportamiento correcto.
- `requireAccessRequestReviewPermission` se ejecuta fuera del bloque `try` del handler y arroja `FORBIDDEN` en lugar de devolver una respuesta JSON 403.
- Riesgo: la interfaz puede mostrar un error genérico 500 en lugar de “Sin permisos”.

## Pruebas adicionales sugeridas y ejecutadas

- Aislamiento de datos por nomenclatura QA.
- Confirmación de que los intentos rechazados no generan filas de inscripción.
- Confirmación de promoción automática y notificación al liberar cupo.
- Confirmación de visibilidad por elegibilidad en el catálogo ciudadano.
- Confirmación de persistencia del motivo y fecha de cancelación.
- Confirmación de autoría de documentos: ciudadano, `admin` y recepcionista QA.
- Confirmación visual del selector de establecimientos en Recepción.

## Recepción, ingreso y asistencia automática

| ID | Prueba | Resultado | Evidencia |
|---|---|---|---|
| QA-ACC-ASI-01 | Autorizar ingreso desde Recepción | OK | Se creó un `RegistroAcceso` permitido para el establecimiento. |
| QA-ACC-ASI-02 | Marcar las clases del día automáticamente | OK | Dos clases confirmadas del mismo día y establecimiento quedaron `PRESENTE`. |
| QA-ACC-ASI-03 | Verificar origen automático | OK | Ambas asistencias quedaron con origen `ACCESO`. |
| QA-ACC-ASI-04 | Evitar sobrescribir asistencia | OK | La creación utiliza la clave única clase/inscripción y omite registros previamente cargados. |
| QA-ACC-ASI-05 | Corregir desde la planilla | OK | Una presencia automática fue cambiada a `AUSENTE` y su origen pasó a `MANUAL`. |
| QA-ACC-ASI-06 | Medir ingreso sin asistencia a clase | OK | La planilla informó `enteredButAbsentCount: 1` y marcó la falta injustificada. |
| QA-ACC-ASI-07 | Compartir gestión entre Profesor y Administración | OK | Ambos espacios reutilizan la misma planilla y sus APIs conservan permisos de alta, edición y carga por lote. |
| QA-ACC-ASI-08 | Administrador autenticado marca ausente | OK | El handler administrativo respondió 200, persistió `AUSENTE`, origen `MANUAL`, métrica 1 y auditoría `ASIGNAR`. |
| QA-ACC-ASI-09 | Profesor asignado y autenticado marca ausente | OK | El handler del portal docente respondió 200, validó la asignación, persistió `AUSENTE`, origen `MANUAL`, métrica 1 y auditoría `ASIGNAR`. |

La prueba integrada `scripts/test-reception-access-attendance.ts` crea datos temporales con nomenclatura QA, ejecuta el circuito y los elimina al finalizar.

## Datos preservados

El lote `qa-e2e-20260806` no fue eliminado para permitir su revisión en las pantallas, tablas, reportes y métricas. No se modificaron usuarios ni actividades reales existentes.
