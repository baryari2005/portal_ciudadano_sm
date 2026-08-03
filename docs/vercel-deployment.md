# Configuración de Vercel

Esta guía detalla las variables de entorno y los servicios que deben configurarse para desplegar el Portal Ciudadano en Vercel.

> Nunca guardar claves reales, contraseñas o secretos dentro del repositorio. Los valores deben cargarse desde **Vercel → Project → Settings → Environment Variables**.

## 1. Entornos de Vercel

Configurar las variables, según corresponda, para:

- **Production**: despliegues realizados desde `main`.
- **Preview**: pruebas de otras ramas, como `dev`.
- **Development**: uso local mediante Vercel CLI, si se utiliza.

Como punto de partida, las variables técnicas pueden habilitarse en los tres entornos. Para producción y preview se recomienda usar bases de datos separadas cuando sea posible.

## 2. Base de datos PostgreSQL y Prisma

Variables obligatorias:

```env
DATABASE_URL=
DIRECT_URL=
```

- `DATABASE_URL`: conexión PostgreSQL utilizada normalmente por la aplicación. Con Supabase se recomienda la URL del pooler.
- `DIRECT_URL`: conexión directa utilizada por Prisma para tareas administrativas y migraciones.

No exponer estas variables con el prefijo `NEXT_PUBLIC_`.

### Migraciones

El proyecto ejecuta `prisma generate` durante la instalación, pero no ejecuta automáticamente las migraciones.

Antes de habilitar la aplicación en producción, aplicar:

```bash
npx prisma migrate deploy
```

El comando debe ejecutarse usando las variables de la base de producción. No utilizar `prisma migrate dev` en producción.

## 3. Autenticación

Variables obligatorias:

```env
JWT_SECRET=
JWT_EXPIRES=8h
APP_URL=https://tu-dominio.vercel.app
```

- `JWT_SECRET`: valor largo, aleatorio y exclusivo del entorno.
- `JWT_EXPIRES`: duración de la sesión. El valor actual recomendado es `8h`.
- `APP_URL`: URL pública de la aplicación. Debe actualizarse cuando se configure un dominio definitivo.

No cambiar `JWT_SECRET` en una aplicación activa salvo que se quiera invalidar todas las sesiones existentes.

## 4. Supabase

Variables obligatorias:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública `anon`.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privada `service_role`, disponible únicamente en el servidor.

La variable `SUPABASE_SERVICE_ROLE_KEY` nunca debe llevar el prefijo `NEXT_PUBLIC_`.

## 5. Supabase Storage

Variables recomendadas:

```env
SUPABASE_BUCKET_AVATARS=avatars
SUPABASE_BUCKET_ACTIVITY_IMAGES=avatars
SUPABASE_BUCKET_FACILITY_IMAGES=avatars
SUPABASE_BUCKET_TEACHER_IMAGES=avatars
SUPABASE_BUCKET_MEDICAL_COVERAGE_IMAGES=avatars
SUPABASE_BUCKET_ENROLLMENT_DOCUMENTS=enrollment-documents
SUPABASE_BUCKET=docs
```

Los buckets también deben existir dentro de Supabase Storage.

Configuración recomendada:

- `avatars`: imágenes de usuarios, personal, actividades, establecimientos y coberturas.
- `enrollment-documents`: documentación presentada por ciudadanos. Debe ser privado.
- `docs`: documentos administrativos. Debe ser privado si contiene información personal.

Verificar las políticas de acceso de Supabase antes de habilitar producción.

## 6. Credenciales QR

Variable obligatoria para producción:

```env
QR_CREDENTIAL_ENCRYPTION_KEY=
```

Debe ser una clave larga, aleatoria y estable. No cambiarla después de emitir credenciales QR, porque las credenciales cifradas anteriormente podrían dejar de recuperarse.

Parámetros opcionales:

```env
QR_ATTENDANCE_EARLY_MINUTES=30
QR_ATTENDANCE_LATE_MINUTES=60
NEXT_PUBLIC_QR_ATTENDANCE_EARLY_MINUTES=30
NEXT_PUBLIC_QR_ATTENDANCE_LATE_MINUTES=60
ACCESS_EARLY_MINUTES=30
ACCESS_LATE_MINUTES=30
```

Las variables públicas y privadas de anticipación y tolerancia deberían mantener los mismos valores.

## 7. Correo electrónico

Necesario para recuperación de contraseña y funciones que envían correos:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SUPPORT_EMAIL=
```

Identidad visual para los mensajes:

```env
BRAND_NAME=Portal Ciudadano - Más San Miguel
BRAND_LOGO_URL=https://tu-dominio.com/logo.png
```

Consideraciones:

- Usar `SMTP_SECURE=true` normalmente con el puerto `465`.
- Usar `SMTP_SECURE=false` normalmente con el puerto `587` y STARTTLS.
- `BRAND_LOGO_URL` debe ser una URL pública HTTPS.
- Verificar que el dominio remitente esté autorizado por el proveedor de correo.

## 8. Google Maps

Opcional:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Sin esta variable, los formularios permiten ingresar la dirección manualmente.

En Google Cloud se debe:

1. Crear o seleccionar un proyecto.
2. Asociar una cuenta de facturación.
3. Habilitar **Maps JavaScript API** y **Places API**.
4. Crear una API key.
5. Restringir la clave por sitios web autorizados.
6. Agregar el dominio de producción y los dominios de preview que se quieran utilizar.

Ejemplos de restricciones HTTP:

```txt
https://tu-dominio.com/*
https://tu-proyecto.vercel.app/*
```

## 9. Asistente de ayuda

Opcional. Solo es necesario si se habilita el asistente basado en OpenAI:

```env
OPENAI_API_KEY=
OPENAI_ASSISTANT_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` debe permanecer únicamente en el servidor.

## 10. Procesos automáticos

### Avisos de vencimiento documental

```env
DOCUMENT_EXPIRATION_CRON_SECRET=
```

La tarea programada debe enviar este secreto como Bearer token al endpoint interno correspondiente.

### Cierre automático de asistencias

```env
ATTENDANCE_AUTO_CLOSE_CRON_SECRET=
ATTENDANCE_SYSTEM_ACTOR_ID=
```

- `ATTENDANCE_AUTO_CLOSE_CRON_SECRET`: secreto enviado al proceso interno de cierre.
- `ATTENDANCE_SYSTEM_ACTOR_ID`: UUID del usuario del sistema que quedará registrado como responsable de la operación automática.

Los secretos de los procesos automáticos deben ser largos, aleatorios y diferentes entre sí.

## 11. Parámetros de participación y seguridad

Opcionales:

```env
DEFAULT_JUSTIFIED_ABSENCE_THRESHOLD=10
DEFAULT_UNJUSTIFIED_ABSENCE_THRESHOLD=3
PASSWORD_RESET_TTL_MIN=30
AUDIT_IP_SALT=
```

- Los umbrales determinan cuándo una participación puede quedar en revisión.
- `PASSWORD_RESET_TTL_MIN` define la vigencia del enlace de recuperación de contraseña.
- `AUDIT_IP_SALT` se utiliza para anonimizar direcciones IP en auditoría. Debe ser aleatorio y estable.

## 12. Usuario administrador inicial

Estas variables se utilizan al ejecutar el seed. No son necesarias para el funcionamiento normal después de crear el administrador:

```env
ADMIN_USERID=admin
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

No utilizar en producción las credenciales predeterminadas del entorno de desarrollo.

Para ejecutar el seed:

```bash
npx prisma db seed
```

Ejecutar el seed de producción una sola vez o verificar previamente que sea idempotente.

## 13. Variables que no deben configurarse manualmente

Vercel y Next.js administran variables como `NODE_ENV`. No es necesario crearlas manualmente.

La variable local `YOUR_PASSWORD` no es utilizada por la aplicación y no debe copiarse a Vercel.

La variable `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` tampoco es utilizada actualmente; el cliente usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 14. Checklist previo al despliegue

- [ ] Configurar `DATABASE_URL` y `DIRECT_URL`.
- [ ] Aplicar `npx prisma migrate deploy` sobre producción.
- [ ] Configurar autenticación y una URL pública válida.
- [ ] Configurar las claves de Supabase.
- [ ] Crear y proteger los buckets de Storage.
- [ ] Configurar una clave estable para cifrado QR.
- [ ] Configurar SMTP y probar recuperación de contraseña.
- [ ] Configurar Google Maps si se utilizará autocompletado.
- [ ] Configurar los secretos de tareas automáticas.
- [ ] Ejecutar el seed inicial de roles, permisos y administrador cuando corresponda.
- [ ] Confirmar que la rama de producción de Vercel sea `main`.
- [ ] Ejecutar `npm run build` antes de promover cambios desde `dev`.
- [ ] Probar inicio de sesión, carga de imágenes, documentos, notificaciones y QR en producción.

## 15. Variables mínimas para el primer despliegue

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES=8h
APP_URL=https://tu-proyecto.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
QR_CREDENTIAL_ENCRYPTION_KEY=
```

Las demás variables pueden incorporarse a medida que se habiliten correo, Google Maps, asistente y procesos automáticos.
