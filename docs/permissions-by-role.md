# Matriz de permisos por rol

Esta matriz refleja las operaciones protegidas actualmente por la API y se utiliza como criterio para `prisma/seed.rols.ts`.

| Módulo | Administrador | Recepción | Profesor |
| --- | --- | --- | --- |
| Roles y permisos | Gestión completa | — | — |
| Usuarios | Gestión completa, importación, exportación y credenciales QR | Ver, crear, editar y gestionar credenciales QR | — |
| Legajos | Ver y editar | Ver | — |
| Establecimientos | Gestión completa | Ver | — |
| Actividades y catálogos | Gestión completa | Ver actividades | — |
| Horarios | Gestión completa | Ver | Ver únicamente los propios mediante el portal docente |
| Inscripciones | Gestión completa | Ver, crear, editar, aprobar/asignar y cancelar | Ver inscriptos de clases propias mediante el portal docente |
| Documentación de inscripciones | Gestión completa | Ver, observar, aprobar y rechazar | — |
| Requisitos | Gestión completa | Ver | — |
| Control de ingreso | Gestión completa | Ver, registrar, autorizar, corregir y anular | — |
| Clases | Gestión completa | — | Ver únicamente las propias mediante el portal docente |
| Asistencias | Gestión completa | — | Ver, registrar, modificar, cerrar y reabrir en clases propias |
| Notificaciones administrativas | Gestión completa | — | — |
| Auditoría | Gestión completa | — | — |
| Reportes | Gestión completa | — | — |
| Profesores | Gestión completa | — | — |

## Criterios de seguridad

- Administrador recibe todos los permisos definidos por el seed.
- Recepción no administra configuración, roles, catálogos, clases, asistencias, auditoría ni reportes.
- Profesor opera a través de `/api/teacher/*`. Esas rutas validan que el profesor esté asignado a la clase u horario antes de devolver o modificar datos.
- El rol `user` no recibe permisos administrativos; utiliza exclusivamente las rutas autenticadas `/api/citizen/*`, que operan sobre el usuario de la sesión.
- Los permisos son globales por módulo y acción; el alcance por establecimiento no está modelado actualmente.
- El seed reemplaza la matriz de permisos de estos roles en cada ejecución para mantener un resultado reproducible.
