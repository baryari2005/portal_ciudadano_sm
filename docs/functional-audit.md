# Relevamiento funcional integral

Fecha: 2026-07-20

## Arquitectura y autorización

- Next.js App Router separa los espacios `dashboard`, `citizen` y `teacher` mediante route groups.
- Las páginas consumen servicios cliente; las APIs delegan reglas de negocio a servicios `*.server.ts` y Prisma.
- `requireAuth` valida JWT y el estado efectivo de la cuenta. `requirePermission` valida pares `modulo:accion` en el backend.
- El frontend obtiene los permisos efectivos desde `useAuth` y utiliza `useCan` o configuraciones centralizadas.
- El Portal Ciudadano no necesita permisos administrativos: sus APIs usan el usuario autenticado y filtran por `userId`.
- El Portal del Profesor combina permisos con un perfil `Profesor` activo y validaciones de asignación a horario/clase.
- La Ayuda utiliza permisos efectivos y modos `all`/`any`; no infiere contenido por el nombre del rol.

## Inventario por módulo

| Módulo | Rutas de interfaz | Endpoints principales | Permisos efectivos | Acceso habitual | Estado y relaciones |
| --- | --- | --- | --- | --- | --- |
| Portal Ciudadano | `/citizen`, `/citizen/activities`, `/citizen/enrollments`, `/citizen/schedule`, `/citizen/attendance`, `/citizen/qr`, `/citizen/profile` | `/api/citizen/*` | Cuenta autenticada; sin permisos administrativos | Cualquier usuario activo | Conectado con actividades, horarios, inscripciones, clases, asistencias, documentos y QR. |
| Actividades | `/activities`, `/activities/new`, `/activities/[id]/edit` | `/api/actividades`, `/api/actividades/[id]` | `actividades:ver/crear/editar/eliminar`; `requirements:asignar` al asociar requisitos | Administración | CRUD conectado. Cancelación cambia estado; no cancela automáticamente horarios, clases o inscripciones relacionadas. |
| Categorías | `/activity-categories` y formularios | `/api/categorias-actividades/*` | `categorias_actividades:ver/crear/editar/eliminar` | Administración | Conectado con actividades. Eliminar representa desactivar. |
| Públicos objetivo | `/target-audiences` y formularios | `/api/publicos-objetivo/*` | `publicos_objetivo:ver/crear/editar/eliminar` | Administración | Conectado con actividades y edades sugeridas. |
| Establecimientos | `/facilities`, `/facilities/new`, `/facilities/[id]/edit` | `/api/establecimientos/*` | `establecimientos:ver/crear/editar/eliminar` | Administración | Conectado con actividades, horarios, clases y control de acceso. |
| Horarios | `/activity-schedules`, `/activity-schedules/new`, edición | `/api/activity-schedules/*` | `activity_schedules:ver/crear/editar/eliminar/asignar` | Administración; consulta docente | Valida horas, duplicados y conflictos de sede/docente. Define cupo, sobrecupo, espera y profesores. |
| Profesores | `/teachers` y formularios | `/api/profesores/*`, `/api/teacher/*` | Administración: `profesores:*`; portal: permisos de horarios, clases, inscripciones y asistencia | Administración y profesor | El perfil se vincula a un usuario. No hay autoasignación; se asigna en horario y clase. |
| Inscripciones | `/enrollments`, alta y edición; `/citizen/enrollments` | `/api/enrollments/*`, `/api/citizen/enrollments/*` | Administración: `enrollments:*`; ciudadano: propiedad de sesión | Administración, recepción y ciudadano | Cupo transaccional, sobrecupo, espera, duplicados y promoción automática conectados. |
| Clases programadas | `/activity-sessions`, alta/generación y edición; `/teacher/sessions` | `/api/activity-sessions/*`, `/api/teacher/sessions/*` | `activity_sessions:*`; docente requiere `ver` y propiedad | Administración y profesor | Se generan desde un horario para fechas concretas. Sin generación no hay agenda ni acceso diario. |
| Asistencias | `/attendance`; planillas del profesor | `/api/attendance/*`, `/api/teacher/attendance/*` | `attendance:ver/crear/editar/asignar/eliminar` | Administración y profesor | Manual, lote, cierre y reapertura conectados. `eliminar` representa reapertura, no borrado. |
| Asistencia QR | Planilla/escáner dentro de clase docente | `/api/teacher/attendance/[sessionId]/qr`, `/api/attendance/qr/register` | `attendance:asignar`; docente además debe pertenecer a la clase | Profesor o administración | Valida QR, inscripción y horario. No es el mismo registro que control de acceso. |
| Control de acceso | `/access`, `/access/scan`, `/access/manual`, `/access/history` | `/api/access/*` | `access:ver/crear/editar/eliminar/asignar` | Recepción y administración | Valida clase del día, sede, ventana horaria e inscripción. Registra `RegistroAcceso`, no `Asistencia`. |
| Usuarios | `/users`, alta y edición | `/api/users/*`, `/api/admin/users` | `usuarios:ver/crear/editar/eliminar/importar/exportar/asignar` | Administración y recepción limitada | CRUD y credencial QR conectados. El perfil ciudadano usa endpoints propios. |
| Roles y permisos | `/roles`, alta y edición | `/api/roles/*`, `/api/permissions` | `roles:ver/crear/editar` | Administración | Edición de matriz conectada. `roles:eliminar` existe en seed pero no tiene operación visible/backend equivalente. |
| Ayuda | `/help`, `/citizen/help`, `/teacher/help` | `/api/assistant` opcional | Configuración `all/any` sobre permisos efectivos | Todos | Contenido centralizado, buscable y filtrado. `/soporte` queda como redirección de compatibilidad. |

## Circuitos cerrados

- Solicitud ciudadana, aprobación, ingreso y acceso al Portal Ciudadano.
- Consulta y búsqueda de actividades con horarios activos.
- Inscripción con cupo, sobrecupo, lista de espera y prevención de duplicados.
- Cancelación propia y promoción automática de la primera persona en espera.
- Consulta de inscripciones, documentación, agenda, asistencia y QR ciudadano.
- Creación de profesor, asignación administrativa a horarios y consulta docente con control de propiedad.
- Generación de clases, planilla manual, QR docente, cierre y reapertura por permiso.
- Control de acceso de recepción por QR y búsqueda manual con historial y auditoría.
- Edición de roles y asignación reproducible de permisos mediante seed.

## Circuitos incompletos o decisiones funcionales

1. **Edad:** se muestra en actividades, pero `createEnrollment` no valida la edad del ciudadano.
2. **Requisitos:** se informan y permiten documentación posterior, pero no bloquean automáticamente la confirmación.
3. **Precio:** es informativo; no existe pago, deuda ni comprobante.
4. **Estado de actividad:** la inscripción valida que el horario esté activo, pero no vuelve a validar el estado de la actividad si se llama directamente al endpoint.
5. **Cancelación en cascada:** suspender/cancelar una actividad no define automáticamente qué ocurre con horarios, clases e inscripciones vigentes.
6. **Recepción versus asistencia:** el control de ingreso no marca asistencia. Debe decidirse si recepción también necesita una pantalla de asistencia para una clase seleccionada.
7. **Permisos genéricos sin uso:** `reports`, `audit_log`, `notifications` y otros seeds crean cinco acciones estándar aunque varias no tienen endpoint ni interfaz.
8. **Reapertura docente:** el rol Profesor posee `attendance:eliminar`, por lo que actualmente puede reabrir sus propias planillas. Confirmar si debe reservarse a supervisión.
9. **Importación/exportación:** existen permisos y endpoints, pero los accesos del sidebar están comentados; no se documentan como flujo principal.

## Matriz de validación

| Circuito | Paso | Pantalla | Endpoint | Permiso frontend | Permiso backend | Estado | Observación |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Registro ciudadano | Solicitar cuenta | `/request-access` | `POST /api/auth/request-access` | Público | Público + rol `user` activo | Correcto | Crea cuenta pendiente y perfil completo. |
| Registro ciudadano | Aprobar cuenta | `/users` | APIs de usuarios | `usuarios:editar` | `usuarios:editar` | Correcto | Requiere operador autorizado. |
| Actividades ciudadanas | Buscar/listar | `/citizen/activities` | `GET /api/citizen/activities` | Autenticado | `requireAuth` | Correcto | Busca por nombre/descripción; no hay filtros avanzados. |
| Actividades ciudadanas | Ver detalle | `/citizen/activities/[id]` | `GET /api/citizen/activities/[id]` | Autenticado | `requireAuth` | Correcto | Muestra horarios, cupos, requisitos y precio. |
| Inscripción | Crear | Detalle ciudadano | `POST /api/citizen/enrollments` | Autenticado | Propiedad del JWT | Incompleto | Cupos correctos; falta decisión/validación de edad y requisitos. |
| Lista de espera | Ingresar | Detalle ciudadano | Mismo POST | Autenticado | Propiedad del JWT | Correcto | Sólo cuando no hay cupo y el horario permite espera. |
| Lista de espera | Promover | Sin pantalla específica | Servicio transaccional | No aplica | Interno | Correcto | Se ejecuta al liberar un cupo confirmado. |
| Cancelación | Cancelar propia | `/citizen/enrollments` | `DELETE /api/citizen/enrollments/[id]` | Autenticado | Propiedad del JWT | Correcto | Sólo estados confirmada, espera o pendiente. |
| Agenda | Ver próximas clases | `/citizen/schedule` | `GET /api/citizen/schedule` | Autenticado | Propiedad del JWT | Correcto | Requiere clases previamente generadas. |
| QR ciudadano | Emitir/revocar | `/citizen/qr` | `/api/citizen/qr/*` | Autenticado | Propiedad del JWT | Correcto | Una credencial activa por usuario. |
| Profesor | Asociar usuario | `/teachers` | `/api/profesores` | `profesores:crear` | `profesores:crear` | Correcto | Lo realiza administración. |
| Profesor | Asignar horario | Formulario de horario | `/api/activity-schedules/*` | `activity_schedules:asignar` | `activity_schedules:asignar` al modificar asignaciones | Correcto | Principal opcional y adicionales permitidos. |
| Profesor | Ver sus clases | `/teacher/sessions` | `/api/teacher/sessions` | Permisos mínimos docentes | Permisos + perfil/propiedad | Correcto | No expone clases ajenas. |
| Asistencia profesor | Manual/lote | Planilla docente | `POST /api/teacher/attendance/[sessionId]` | `attendance:asignar` | Permiso + propiedad | Correcto | Justificada requiere motivo. |
| Asistencia profesor | QR | Escáner de clase | `POST /api/teacher/attendance/[sessionId]/qr` | `attendance:asignar` | Permiso + propiedad | Correcto | Valida QR e inscripción del horario. |
| Asistencia | Cerrar | Planilla | Acción `close` | `attendance:asignar` | `attendance:asignar` | Correcto | Completa ausentes y bloquea edición. |
| Asistencia | Reabrir | Planilla | Acción `reopen` | `attendance:eliminar` | `attendance:eliminar` | Requiere decisión funcional | Profesor posee actualmente este permiso. |
| Recepción | QR de ingreso | `/access/scan` | `POST /api/access/qr/validate` | `access:ver` | `access:crear` | Permiso inconsistente | Navegación sólo exige `ver`; operación exige `crear`. La ayuda exige ambos. |
| Recepción | Búsqueda manual | `/access/manual` | `/api/access/manual/search` | `access:ver` | `access:ver` | Correcto | DNI, nombre, apellido y email. |
| Recepción | Autorizar manual | `/access/manual` | `/api/access/manual/register` | Según acciones de UI | `access:crear` + `access:asignar` para permitir | Correcto | La observación es obligatoria. |
| Recepción | Marcar asistencia | No existe en módulo de acceso | `/api/attendance/qr/register` | Falta interfaz contextual | `attendance:asignar` | Falta interfaz | Control de acceso y asistencia permanecen separados. |
| Administración | Crear actividad | `/activities/new` | `POST /api/actividades` | `actividades:crear` | `actividades:crear` | Correcto | Requisitos requieren permiso adicional al asociarlos. |
| Administración | Crear horario | `/activity-schedules/new` | `POST /api/activity-schedules` | `activity_schedules:crear` | `activity_schedules:crear` | Correcto | Asignaciones se validan adicionalmente al editar. |
| Administración | Generar clases | `/activity-sessions/new` | `POST /api/activity-sessions/generate` | `activity_sessions:crear` | `activity_sessions:crear` | Correcto | Paso obligatorio e independiente. |
| Administración | Suspender/cancelar actividad | Detalle/edición | `/api/actividades/[id]` | `actividades:eliminar` | `actividades:eliminar` | Requiere decisión funcional | No hay política de cascada a horarios/clases/inscripciones. |
| Roles y permisos | Editar matriz | `/roles/[id]/edit` | `PUT /api/roles/[id]/permisos` | `roles:editar` | `roles:editar` | Correcto | La sesión debe refrescar permisos. |
| Ayuda | Filtrar contenido | Rutas `/help` | Configuración local y `/api/assistant` | Permisos efectivos | `requireAuth`; asistente usa mismos permisos | Correcto | No depende del nombre del rol. |

## Permisos usados por la Ayuda

- Ciudadano: sin permisos administrativos; contenido disponible a toda cuenta activa.
- Profesor: `activity_schedules:ver`, `activity_sessions:ver`, `enrollments:ver`, `attendance:ver`, `attendance:asignar`.
- Recepción: `access:ver`, `access:crear`, `access:asignar`.
- Administración: permisos reales de lectura/creación de actividades, horarios, clases, profesores, establecimientos, catálogos, inscripciones, asistencias, usuarios y roles.

