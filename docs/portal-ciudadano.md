# Portal Ciudadano: diseño técnico-funcional

Actualizado: 2026-07-20.

## Objetivo y conceptos

El portal permite solicitar una cuenta, consultar actividades, inscribirse y gestionar documentación, agenda, asistencia, notificaciones, perfil y QR sin exponer datos de terceros.

| Concepto | Descripción |
| --- | --- |
| Actividad | Propuesta general ofrecida por el municipio. |
| Horario | Configuración recurrente de día, hora, sede, profesor y cupo. |
| Inscripción | Relación del participante con un horario. |
| Clase programada | Ocurrencia concreta en una fecha determinada. |
| Control de acceso | Registro de ingreso realizado desde recepción. |
| Asistencia | Presencia registrada en una clase concreta. |
| Solicitud de acceso | Pedido para habilitar una cuenta ciudadana. |
| Documentación | Requisitos presentados para habilitar la participación. |

## Solicitudes de acceso

`Usuario.estado` controla el acceso y `SolicitudAcceso` conserva cada envío. Sus estados son `PENDIENTE`, `APROBADA` y `RECHAZADA`; registra envío, revisión, revisor y motivo. Solo puede existir una solicitud pendiente por usuario. La aprobación y el rechazo son transaccionales y no se resuelven desde la edición genérica del usuario.

Una cuenta pendiente o rechazada obtiene una sesión limitada para consultar `/request-access/status`. El rechazo exige un motivo de 10 a 500 caracteres. Una persona rechazada puede corregir sus datos y crear un nuevo registro; el anterior no se modifica.

Rutas: `/request-access`, `/request-access/status`, `/users`. Endpoints: `POST /api/auth/request-access`, `GET /api/auth/request-access/status`, `GET|PATCH /api/users/[id]/access-request`. La revisión requiere `usuarios:editar`; la consulta ciudadana valida propiedad mediante JWT.

## Inscripción, edad, cupos y espera

La edad se calcula en UTC tomando como referencia el instante de inscripción. Los límites mínimo y máximo son inclusivos. Si existe una restricción y falta una fecha de nacimiento válida, el backend rechaza la operación. La misma función se usa en inscripciones ciudadanas y administrativas; no existe excepción administrativa.

El horario se bloquea dentro de una transacción serializable. La restricción única usuario-horario evita duplicados. Con capacidad se confirma; sin capacidad ingresa a espera si está habilitada. Al liberar un cupo se promueve automáticamente la primera inscripción por fecha de espera, sin aceptación posterior.

## Documentación, clases y notificaciones

La documentación conserva requisito, versiones, presentación, estado, revisión, revisor, fecha y motivo. No tiene vencimiento automático. Inscripción y documentación son estados separados; ante falta documental se advierte, pero no se bloquea asistencia porque esa política no está definida.

Las clases puntuales pueden suspenderse, cancelarse o reprogramarse sin modificar el horario recurrente. La agenda consume la clase concreta. La generación permite excluir fechas informadas; no incluye un calendario fijo de feriados.

Las notificaciones internas poseen destinatario, tipo, título, mensaje, prioridad, lectura y enlace. Cubren acceso, inscripciones, espera, documentos, clases y credenciales QR. No se envían emails ni WhatsApp.

## QR, perfil y seguridad

La credencial QR es opaca, admite una sola credencial activa y la reemisión invalida la anterior. Recepción registra `RegistroAcceso`; el profesor registra `Asistencia`. Una operación no crea la otra. El ciudadano solo accede a recursos ligados a su `userId`.

Nombre, apellido, DNI, email y nacimiento son de solo lectura en el perfil ciudadano. Teléfono y domicilio son editables. Contacto de emergencia y preferencias de notificación aún no tienen modelo.

## Limitaciones y decisiones pendientes

- No existe modelo de responsables y menores. Requiere diseñar participante, vínculo, autorización, contactos, propiedad de agenda/QR e inscripción; no se implementó una relación parcial.
- No existe vencimiento de documentación ni regla aprobada para impedir asistencia.
- No hay calendario administrativo de feriados.
- El historial se distribuye entre Mis inscripciones, agenda, asistencia, documentos y notificaciones; falta una vista cronológica única.
- Recuperación y cambio de contraseña deben seguir usando el sistema actual; no se creó un mecanismo paralelo.

## Base de datos

La migración `20260720180000_add_access_request_history` crea `SolicitudAcceso`, su enum, índices, restricción de una pendiente por usuario y tipos de notificación. Realiza backfill de usuarios pendientes o rechazados.

Aplicación sin reset:

```bash
npx prisma migrate deploy
```

## Matriz de circuitos

| Circuito | Pantalla | Endpoint | Permiso UI/backend | Estado previo | Cambio realizado | Estado final |
| --- | --- | --- | --- | --- | --- | --- |
| Solicitud | `/request-access` | `POST /api/auth/request-access` | Público | Usuario sin historial | Registro separado y notificación | Completo |
| Aprobar/rechazar | `/users` | `PATCH /api/users/[id]/access-request` | `usuarios:editar` | Estado genérico | Transacción, revisor, fecha y motivo | Completo |
| Reenvío | `/request-access/status` | POST de solicitud | Sesión limitada/propiedad | Duplicado bloqueado | Nueva solicitud sin borrar anterior | Completo |
| Edad | Detalle/alta administrativa | APIs de inscripción | Propiedad o `enrollments:crear` | Informativa | Regla central backend | Backend completo |
| Documentación | Inscripciones/revisión | APIs de documentos | Propiedad / `enrollment_documents:*` | Implementado | Se mantuvo | Completo salvo vencimiento |
| Menores | — | — | — | Sin modelo | No se improvisó | Requiere definición |
| Espera/promoción | Mis inscripciones | APIs de inscripción | Propiedad / `enrollments:*` | Implementado | Se mantuvo | Completo |
| Agenda/excepciones | Próximas clases | APIs de sesiones | Propiedad / `activity_sessions:*` | Implementado | Se mantuvo | Completo |
| Notificaciones | Notificaciones | API ciudadana | Propiedad | Implementado | Eventos de acceso agregados | Completo |
| Historial | Varias vistas | APIs ciudadanas | Propiedad | Distribuido | Historial de acceso agregado | Parcial: falta timeline único |
| QR | Mi QR / acceso / clase | APIs QR | Propiedad, `access:*`, `attendance:*` | Implementado | Se mantuvo | Completo |
| Perfil | Mi perfil | `/api/citizen/profile` | Propiedad | Implementado | Se mantuvo | Parcial por contactos/preferencias |
