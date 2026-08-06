# Ejecución QA E2E — Administrador y Ciudadano

## Datos de ejecución

- Fecha: 2026-08-06
- Ambiente: local, `http://localhost:3000`
- Rama: `dev`
- Navegador: Chrome
- Administrador: `admin`
- Ciudadano QA solicitado: `qa-ciudadano-0806`
- DNI QA: `95908061`
- Convenciones: `OK`, `ERROR`, `BLOQUEADO`, `PENDIENTE`

> Los datos con prefijo `qa-` fueron creados exclusivamente para esta ejecución.

## Resumen vivo

| Estado | Cantidad |
|---|---:|
| OK | 19 |
| ERROR | 2 |
| BLOQUEADO | 3 |
| PENDIENTE | En ejecución |

## Solicitud de acceso ciudadana

| ID | Prueba | Resultado | Evidencia / observación |
|---|---|---|---|
| E2E-ACC-01 | Abrir login y visualizar collage, credenciales y acceso a solicitud | OK | Login cargó cuatro imágenes, Usuario, Contraseña, recuperación y enlace Solicitar acceso. |
| E2E-ACC-02 | Abrir Solicitar acceso | OK | Se visualizaron los siete pasos: personales, credenciales, domicilio, contacto, cobertura, imágenes y revisión. |
| E2E-ACC-03 | Completar identidad en UI | BLOQUEADO | Nombre, apellido y DNI pudieron completarse. El calendario personalizado no expuso opciones accionables al controlador; se continúa por API real y queda pendiente una ejecución manual del selector. |
| E2E-ACC-04 | Enviar solicitud pública válida | OK | `POST /api/auth/request-access` respondió `201`: “Solicitud enviada correctamente”. Usuario `qa-ciudadano-0806`. |

## Aprobación administrativa

| ID | Prueba | Resultado | Evidencia / observación |
|---|---|---|---|
| E2E-ADM-01 | Autenticar administrador por API | OK | `POST /api/auth/login` autenticó a `admin` con rol Administrador. |
| E2E-ADM-02 | Ingresar desde el formulario de login | ERROR | En el primer intento el envío terminó en `/login?userId=...&password=...`; luego de reiniciar el servidor ya no expuso la clave en la URL, pero permaneció en login mostrando “Server error”. La autenticación UI no se completó. |
| E2E-ADM-03 | Aprobar solicitud por la ruta HTTP administrativa | BLOQUEADO | La ruta respondió 500 por falta de `.next/server/pages/_document.js` en el servidor local. |
| E2E-ADM-04 | Aprobar solicitud mediante el servicio de negocio | OK | La solicitud quedó `APROBADA` y el usuario cambió de `PENDIENTE` a `ACTIVO`. |
| E2E-ADM-05 | Autenticar al ciudadano después de aprobarlo | OK | El handler real de login respondió 200, estado `ACTIVO`, rol Ciudadano y sin redirección limitada. |

## Alta administrativa de ciudadano

Pendiente de ejecución en UI por el bloqueo del servidor local.

## Actividad y horarios

| ID | Prueba | Resultado | Evidencia / observación |
|---|---|---|---|
| E2E-ACT-01 | Crear y validar horarios funcionalmente | OK | `verify-activity-schedules.ts` finalizó: “Verificación funcional de horarios: OK”. |
| E2E-ACT-02 | Generar una clase a partir de un horario | OK | Se generó una clase de Escuela de Futbol, con establecimiento y profesor relacionados. |

## Inscripciones, cupos y lista de espera

| ID | Prueba | Resultado | Evidencia / observación |
|---|---|---|---|
| E2E-ENR-01 | Ejecutar circuito de cupo, sobrecupo, espera, cancelación y promoción | ERROR | `verify-enrollments.ts` se detuvo al primer alta con “La actividad no admite nuevas inscripciones”. El fixture crea la actividad sin estado `ACTIVA`, por lo que el circuito no llegó a lista de espera. |
| E2E-ENR-02 | Ciudadano sólo lista sus propias inscripciones | OK | El endpoint devolvió únicamente la inscripción propia. |
| E2E-ENR-03 | Ciudadano intenta cancelar una inscripción ajena | OK | Respuesta 404 y la inscripción ajena continuó confirmada. |
| E2E-ENR-04 | Inyectar otro usuario en query o body | OK | El query fue ignorado y el body fue rechazado; no hubo escalamiento horizontal. |
| E2E-ENR-05 | Repetir una inscripción existente | OK | La duplicación fue rechazada. |
| E2E-ENR-06 | Verificar limpieza de datos temporales | OK | Conteos finales iguales a los iniciales: 13 usuarios y 13 inscripciones. |

## Cambios y cancelaciones

Pendiente de validación visual y funcional integrada.

## Documentos, clases, asistencia, QR y notificaciones

| ID | Prueba | Resultado | Evidencia / observación |
|---|---|---|---|
| E2E-ATT-01 | Circuito funcional completo de asistencia | BLOQUEADO | La ejecución superó 180 segundos sin emitir resultado final. La limpieza posterior dejó los conteos base restaurados. |
| E2E-ATT-02 | RBAC de listado, roster, marcas, lote, cierre y reapertura | OK | Todas las operaciones sin permiso respondieron 403. |
| E2E-ATT-03 | Limpieza de fixtures RBAC | OK | Restauró 4 roles, 13 usuarios y 119 relaciones de permisos. |
| E2E-QR-01 | QR sin autenticación | OK | Respuesta 401. |
| E2E-QR-02 | QR autenticado sin permisos | OK | Lectura, estado, emisión y revocación respondieron 403 según correspondía. |
| E2E-QR-03 | Ventana temporal y estados QR | OK | `test-attendance-qr-time.ts` finalizó correctamente. |

## Incidencias encontradas

1. **Crítica — Login por interfaz:** la autenticación visual no se completa. En un primer intento hubo navegación GET con credenciales en la URL; después del reinicio permaneció en `/login` con “Server error”. El handler y la API de login sí autentican correctamente.
2. **Alta — Servidor local inestable (resuelto en esta ejecución):** la caché `.next` estaba incompleta y faltaban chunks generados. Se detuvo el proceso, se regeneró la caché y se reinició con acceso a Supabase. Después del reinicio, login y consulta administrativa respondieron 200.
3. **Media — Script de inscripciones desactualizado:** el fixture de `verify-enrollments.ts` no crea la actividad en estado `ACTIVA`, por lo que ya no alcanza las verificaciones de cupo, espera, promoción y reutilización.
4. **Media — Duración de asistencia:** `verify-attendance-functional.ts` excedió el timeout de 180 segundos sin resultado final.

## Cobertura aún pendiente por bloqueo del entorno UI

- Alta administrativa de un segundo ciudadano desde la pantalla completa.
- Creación de actividad mediante el workflow visual completo.
- Inscripción desde Administración y desde Ciudadano usando la misma actividad QA.
- Confirmación visual de cancelación, lista de espera, promoción y notificaciones.
- Documentos obligatorios, próximas clases, cambio de horarios y baja administrativa en navegador.
