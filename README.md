This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Asistente de ayuda IA

El proyecto ahora incluye un MVP de asistente en `/soporte` que responde en base
a las guias visibles para el usuario actual.

Variables de entorno necesarias:

```bash
OPENAI_API_KEY=tu_api_key
OPENAI_ASSISTANT_MODEL=gpt-4.1-mini
```

Notas:

- El endpoint es `POST /api/assistant`.
- El asistente reutiliza las guias de `src/features/support/lib/help-guides.ts`.
- En esta primera version no usa chunks, embeddings ni base vectorial. El contexto
  se construye en cada consulta con las guias permitidas para ese usuario.




# Restablecer prisma y supabase cuando hay inconcistencias

1. Borrar carpeta prisma
```powershell
rm -Recurse -Force .\prisma\migrations\
```
2. Paso 1 — Asegurar que el schema refleja EXACTAMENTE la DB

```bash
npx prisma db pull
```

3. Paso 2 — Eliminar tabla _prisma_migrations en Supabase

⚠️ Esto NO borra datos de negocio.
Solo borra el historial de migraciones.

En Supabase SQL Editor ejecuta:

```
DROP TABLE IF EXISTS "_prisma_migrations";
```

Perfecto, este es un caso clásico de drift + migraciones editadas en una DB ya productiva (Supabase).
Y como bien dices: no puedes borrar la base ni perder datos.

Vamos por partes 👇

🔥 Qué está pasando realmente

Tienes dos problemas distintos:

1️⃣ Migración modificada después de aplicada
The migration `20251201214457_fecha_nacimiento_date` was modified after it was applied.

Eso significa:

Prisma guardó el checksum de esa migración en _prisma_migrations

Luego tú cambiaste el archivo .sql

Ahora Prisma detecta que el archivo ya no coincide con lo que ejecutó

👉 Prisma no permite eso, porque rompe la historia de migraciones.

2️⃣ Drift (la DB no coincide con las migraciones)
Drift detected: Your database schema is not in sync with your migration history.

Eso significa que:
Alguien modificó la DB manualmente
O hiciste prisma db push
O Supabase generó cambios
O cambiaste el schema.prisma y no migraste correctamente

🚨 Lo que NO debes hacer

No ejecutes:

npx prisma migrate reset

Eso borra todo.

✅ Solución correcta (DB con datos que no se pueden perder)

Como estás en Supabase (entorno persistente), el flujo correcto es:

🟢 Paso 1 — Congelar estado actual de la DB

Ejecuta:

npx prisma db pull

Esto hace:

Lee el schema REAL de la base

Actualiza schema.prisma para que refleje exactamente lo que existe

🟢 Paso 2 — Generar migración BASE desde estado actual

Después:

npx prisma migrate dev --name baseline --create-only

⚠️ Si sigue quejándose por drift, entonces hacemos la forma correcta:

💎 Método Profesional: Baseline en producción

Este es el patrón correcto cuando:

La DB ya existe

Tiene datos

Las migraciones están rotas

🟢 Paso A — Eliminar carpeta migrations local

⚠️ Solo local, NO toca la DB

rm -rf prisma/migrations

En Windows:

rmdir /s prisma\migrations
🟢 Paso B — Crear migración baseline vacía
npx prisma migrate dev --name baseline --create-only

Esto crea una migración basada en el schema actual.

🟢 Paso C — Marcarla como aplicada SIN ejecutarla
npx prisma migrate resolve --applied <timestamp_baseline>

Ejemplo:

npx prisma migrate resolve --applied 20260314193000_baseline

Esto solo inserta el registro en _prisma_migrations
No toca tablas.

🎯 Resultado

Prisma deja de detectar drift

Tu DB no se borra

Tus datos quedan intactos

A partir de ahora puedes migrar normalmente

🧠 Por qué está pasando en tu caso

Veo en el log cosas como:

Column `id` would be dropped and recreated (default changed to gen_random_uuid())

Eso significa que:

Probablemente:

Cambiaste @id de String a @db.Uuid

O agregaste @default(dbgenerated("gen_random_uuid()"))

O cambiaste tipos Date → DateTime

Y Prisma interpreta eso como:

Drop + recreate column

En producción eso es peligroso porque:

Puede borrar datos

Puede romper FK

🔥 Recomendación profesional para Supabase

Cuando uses Supabase:

Nunca uses migrate dev contra producción

Usa:

npx prisma migrate deploy

En CI/CD

Y en desarrollo usa otra base local.

📌 Patrón correcto de entornos
Local DB (Docker Postgres)
    ↓
migrate dev

Staging / Prod (Supabase)
    ↓
migrate deploy

Nunca migrate dev contra Supabase.

🚑 Si quieres la solución más segura posible

Dime:

¿Esa base es producción real?

¿O es solo entorno de desarrollo remoto?

¿Tienes backups en Supabase habilitados?

Y te doy el flujo exacto sin riesgo de pérdida.

Si quieres, puedo explicarte también:

Cómo hacer migraciones seguras cuando cambias UUID

Cómo migrar columnas Date sin perder datos

Cómo arreglar migraciones modificadas sin borrar historial

Solo dime cuál prefieres.

ya borrre migrations
PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> npx prisma migrate dev --name baseline --create-only
warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., prisma.config.ts).
For more information, see: https://pris.ly/prisma-config

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"

- Drift detected: Your database schema is not in sync with your migration history.

The following is a summary of the differences between the expected database schema given your migrations files, and the actual schema of the database.

It should be understood as the set of changes to get from the expected schema to the actual schema.

[+] Added enums
  - EstadoCivil
  - EstadoLaboral
  - Genero
  - LeaveStatus
  - LeaveType
  - Nacionalidad
  - TipoContrato
  - TipoDocumento
  - TipoTelefono

[+] Added tables
  - LeaveRequest
  - LeaveTypeCatalog
  - Legajo
  - PasswordResetToken
  - Rol
  - Usuario
  - VacationBalance
  - payroll_receipts

[*] Changed the LeaveRequest table
  [+] Added index on columns (status, createdAt)
  [+] Added index on columns (userId, createdAt)
  [+] Added foreign key on columns (typeCatalogId)

[*] Changed the LeaveTypeCatalog table
  [+] Added unique index on columns (code)

[*] Changed the Legajo table
  [+] Added index on columns (area, departamento)
  [+] Added index on columns (estadoLaboral)
  [+] Added unique index on columns (numeroLegajo)
  [+] Added unique index on columns (usuarioId)
  [+] Added foreign key on columns (usuarioId)

[*] Changed the PasswordResetToken table
  [+] Added index on columns (expiresAt)
  [+] Added index on columns (userId)

[*] Changed the Rol table
  [+] Added unique index on columns (nombre)

[*] Changed the Usuario table
  [+] Added index on columns (apellido, nombre)
  [+] Added unique index on columns (cuil)
  [+] Added unique index on columns (documento)
  [+] Added unique index on columns (email)
  [+] Added index on columns (rolId)
  [+] Added unique index on columns (userId)
  [+] Added foreign key on columns (rolId)

[*] Changed the VacationBalance table
  [+] Added unique index on columns (userId, year)
  [+] Added foreign key on columns (userId)

[*] Changed the payroll_receipts table
  [+] Added index on columns (cuil, periodDate)
  [+] Added unique index on columns (cuil, period)

- The following migration(s) are applied to the database but missing from the local migrations directory: 20251001182708_init, 20251008181159_add_must_change_password, 20251015201615_add_user_enums, 20251031164116_init, 20251201214457_fecha_nacimiento_date, 20251201203925_leave_requests_indexes, 20251201203925_leave_requests_indexes

We need to reset the "public" schema at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"

You may use prisma migrate reset to drop the development database.
All data will be lost.

Perfecto. Estás a un paso de resolverlo correctamente.
El problema ahora es distinto y más claro 👇

🔥 Qué está pasando ahora

Prisma ahora dice:

The following migration(s) are applied to the database but missing from the local migrations directory

Eso significa:

La tabla _prisma_migrations en Supabase sí tiene historial

Tú borraste prisma/migrations localmente

Prisma detecta inconsistencia entre:

Historial en DB

Archivos locales

Entonces Prisma intenta forzar un reset.

Pero NO vamos a resetear nada.

🎯 Objetivo

Decirle a Prisma:

"Confía en el estado actual de la base. Esto es el nuevo baseline."

Sin borrar datos.

✅ SOLUCIÓN CORRECTA (sin borrar nada)

Vamos a hacer un baseline manual real.

🟢 Paso 1 — Asegurar que el schema refleja EXACTAMENTE la DB

Ejecuta:

npx prisma db pull

Esto es crítico.

Debe actualizar tu schema.prisma para que sea idéntico a la base.

🟢 Paso 2 — Eliminar tabla _prisma_migrations en Supabase

⚠️ Esto NO borra datos de negocio.
Solo borra el historial de migraciones.

En Supabase SQL Editor ejecuta:

DROP TABLE IF EXISTS "_prisma_migrations";

Eso limpia el historial roto.

🟢 Paso 3 — Crear baseline limpio

Ahora sí:

npx prisma migrate dev --name baseline --create-only

Esta vez:

No habrá drift

No habrá historial previo

No intentará resetear

🟢 Paso 4 — Marcar baseline como aplicado

Ahora ejecuta:

npx prisma migrate deploy

O si quieres explícito:

npx prisma migrate resolve --applied <timestamp_baseline>
💡 Qué hicimos realmente

Antes:

DB → tiene tablas + historial viejo
Local → no tiene migrations

Ahora:

DB → tiene tablas
DB → historial limpio
Local → nueva baseline alineada

Ahora Prisma y la base vuelven a estar sincronizados.

🚨 IMPORTANTE PARA EL FUTURO

Nunca hagas esto en Supabase producción:

npx prisma migrate dev

En remoto siempre usa:

npx prisma migrate deploy

migrate dev es solo para bases locales.

🧠 Por qué esto funciona

Porque Prisma solo compara:

schema.prisma

migrations folder

_prisma_migrations table

Si limpiamos la tabla y creamos baseline nueva:

→ Todo vuelve a estar alineado.

📌 Verificación Final

Después del baseline prueba:

npx prisma migrate dev --name test_change

Si no detecta drift, ya estás limpio.

Si quieres, puedo explicarte también:

Cómo separar dev DB y Supabase correctamente

Cómo evitar drift para siempre

Cómo manejar cambios de UUID y Date sin recrear columnas

Cómo hacer migraciones seguras en producción

Dime cuál quieres y lo vemos bien profesional 🔥

ya no existe tabla en supabase y tampoco hay carpetas en prisma y me sigue dando este error
PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> npx prisma migrate dev --name baseline --create-only
warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., prisma.config.ts).
For more information, see: https://pris.ly/prisma-config

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"

Drift detected: Your database schema is not in sync with your migration history.

The following is a summary of the differences between the expected database schema given your migrations files, and the actual schema of the database.

It should be understood as the set of changes to get from the expected schema to the actual schema.

If you are running this the first time on an existing database, please make sure to read this documentation page:
https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/troubleshooting-development

[+] Added enums
  - EstadoCivil
  - EstadoLaboral
  - Genero
  - LeaveStatus
  - LeaveType
  - Nacionalidad
  - TipoContrato
  - TipoDocumento
  - TipoTelefono

[+] Added tables
  - LeaveRequest
  - LeaveTypeCatalog
  - Legajo
  - PasswordResetToken
  - Rol
  - Usuario
  - VacationBalance
  - payroll_receipts

[*] Changed the LeaveRequest table
  [+] Added index on columns (status, createdAt)
  [+] Added index on columns (userId, createdAt)
  [+] Added foreign key on columns (typeCatalogId)

[*] Changed the LeaveTypeCatalog table
  [+] Added unique index on columns (code)

[*] Changed the Legajo table
  [+] Added index on columns (area, departamento)
  [+] Added index on columns (estadoLaboral)
  [+] Added unique index on columns (numeroLegajo)
  [+] Added unique index on columns (usuarioId)
  [+] Added foreign key on columns (usuarioId)

[*] Changed the PasswordResetToken table
  [+] Added index on columns (expiresAt)
  [+] Added index on columns (userId)

[*] Changed the Rol table
  [+] Added unique index on columns (nombre)

[*] Changed the Usuario table
  [+] Added index on columns (apellido, nombre)
  [+] Added unique index on columns (cuil)
  [+] Added unique index on columns (documento)
  [+] Added unique index on columns (email)
  [+] Added index on columns (rolId)
  [+] Added unique index on columns (userId)
  [+] Added foreign key on columns (rolId)

[*] Changed the VacationBalance table
  [+] Added unique index on columns (userId, year)
  [+] Added foreign key on columns (userId)

[*] Changed the payroll_receipts table
  [+] Added index on columns (cuil, periodDate)
  [+] Added unique index on columns (cuil, period)

We need to reset the "public" schema at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"

You may use prisma migrate reset to drop the development database.
All data will be lost.

Ok. Ahora el problema está clarísimo.

👉 No es _prisma_migrations.
👉 Es que tu base todavía tiene TODAS las tablas.

Aunque hayas borrado _prisma_migrations, Prisma está viendo que:

schema.prisma define tablas

migrations/ está vacío

La base YA tiene esas tablas

Entonces Prisma dice:

“Según tu historial (vacío), la base debería estar vacía.
Pero la base tiene tablas.
Hay drift.”

Y por eso quiere hacer reset.

🎯 Lo que realmente está pasando

Tu estado actual es:

DB → Tiene tablas
migrations/ → Vacío
schema.prisma → Tiene modelos

Para Prisma, eso es inconsistente.

💡 La solución correcta ahora

Ya que:

No quieres borrar datos

No quieres resetear

No tienes migraciones

Debes hacer un baseline manual sin usar migrate dev.

✅ SOLUCIÓN DEFINITIVA (funciona siempre)
🟢 Paso 1 — Generar SQL real desde el schema

Ejecuta:

npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > baseline.sql

Esto genera un SQL que representa:

Cómo crear tu base desde cero según tu schema actual.

No toca la base. Solo genera archivo.

🟢 Paso 2 — Crear estructura de migración manual

Crea carpeta:

prisma/migrations/20260314_baseline/

Y mueve el baseline.sql dentro como:

migration.sql

Debe quedar:

prisma/
 └─ migrations/
     └─ 20260314_baseline/
         └─ migration.sql
🟢 Paso 3 — Marcarla como aplicada SIN ejecutarla

Ahora ejecuta:

npx prisma migrate resolve --applied 20260314_baseline

⚠️ Esto solo inserta el registro en _prisma_migrations
No ejecuta el SQL.
No toca tablas.
No borra datos.

🚀 Resultado

Ahora Prisma cree que:

DB → Tiene tablas
Migration history → Dice que ya fueron creadas
Schema → Coincide

Y el drift desaparece.

🧪 Verificación

Después prueba:

npx prisma migrate dev --name test_change

Si no intenta resetear → ya estás alineado.

🔥 Por qué esto es mejor que lo anterior

Porque:

migrate dev siempre intenta comparar contra historial

Pero tú no tienes historial

Entonces hay que crear uno manual

Esto es el procedimiento profesional cuando:

Te conectas a DB existente

Heredas base de datos

Se rompió historial

Migras a Prisma desde SQL

🧠 Nota importante sobre Supabase

Si esta es tu base remota:

Nunca vuelvas a usar:

npx prisma migrate dev

En remoto usa:

npx prisma migrate deploy

Y usa una DB local para dev.

🎯 Si esto falla

Si aún después de esto Prisma detecta drift, entonces puede ser:

Estás apuntando a otro schema (no public)

Tienes extensiones o funciones que Prisma detecta

Supabase creó objetos internos

En ese caso te doy el modo nuclear controlado.

Si quieres, ahora podemos:

Configurar DB local Docker para desarrollo correcto

Separar dev y prod con .env

Dejar tu proyecto con migraciones limpias y profesionales

Dime cuál quieres y lo hacemos bien arquitectónico.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> npx prisma migrate resolve --applied 20260314_baseline
warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., prisma.config.ts).
For more information, see: https://pris.ly/prisma-config

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"
Error: P3017

The migration 20260314_baseline could not be found. Please make sure that the migration exists, and that you included the whole name of the directory. (example: "20201207184859_initial_migration")

Perfecto, este error es simple 👇

Error: P3017
The migration 20260314_baseline could not be found

Prisma no está encontrando exactamente ese nombre de carpeta.

⚠️ migrate resolve exige el nombre exacto del directorio.

🔍 Paso 1 — Verifica el nombre real

En tu proyecto ejecuta:

dir prisma\migrations

Deberías ver algo como:

20260314193210_baseline

⚠️ Prisma normalmente genera timestamp largo, no solo 20260314_baseline.

Si tú lo creaste manual, debe coincidir exactamente.

✅ Cómo debe estar la estructura

Debe ser EXACTAMENTE así:

prisma/
  migrations/
    20260314193210_baseline/
      migration.sql

No puede faltar:

migration.sql

El nombre exacto

La carpeta dentro de migrations

🎯 Paso 2 — Usa el nombre exacto

Supongamos que el folder es:

20260314193210_baseline

Entonces ejecuta:

npx prisma migrate resolve --applied 20260314193210_baseline

Debe ser el nombre completo.

🚨 Si no aparece nada en migrations

Si dir prisma\migrations no muestra nada, entonces:

👉 No creaste bien la carpeta
👉 O no está en la ruta correcta

Verifica que estés en:

C:\Users\Gejol\Desktop\Next\dashboard-rbac

Y que exista:

prisma/migrations/<tu_folder>/migration.sql
🔎 Check rápido

Ejecuta esto y dime qué imprime:

tree prisma /f
🧠 Importante

Prisma no crea automáticamente el folder cuando haces migrate diff.
Tú debes:

Crear carpeta manual

Poner migration.sql

Luego resolver

🎯 Ejemplo completo correcto
mkdir prisma\migrations\20260314195000_baseline
move baseline.sql prisma\migrations\20260314195000_baseline\migration.sql

Luego:

npx prisma migrate resolve --applied 20260314195000_baseline

Haz el dir prisma\migrations y dime exactamente qué nombre ves.
Ahí lo resolvemos en 1 paso.

Perfecto. Ya veo el problema.

Tienes DOS carpetas de baseline:

20260314193210_baseline
20260314_baseline

Y estás intentando resolver solo:

20260314_baseline

Pero Prisma probablemente está leyendo la otra (la que tiene timestamp largo).

🔥 El problema real

Prisma espera:

UNA sola migración

Que tenga migration.sql dentro

Y que el nombre coincida exactamente

Ahora tienes dos posibles conflictos.

✅ SOLUCIÓN LIMPIA

Vamos a dejar solo una.

🟢 Paso 1 — Elimina la carpeta corta

En PowerShell:

rmdir /s prisma\migrations\20260314_baseline
🟢 Paso 2 — Verifica que quede solo esta:
dir prisma\migrations

Debe quedar:

20260314193210_baseline
🟢 Paso 3 — Asegúrate que dentro exista migration.sql
dir prisma\migrations\20260314193210_baseline

Debe existir:

migration.sql
🟢 Paso 4 — Resolver con el nombre EXACTO

Ahora ejecuta:

npx prisma migrate resolve --applied 20260314193210_baseline

Copia exactamente el nombre que aparece en dir.

🎯 Después de eso

Prueba:

npx prisma migrate dev --name test_change

Si no pide reset → quedó perfecto.

⚠️ Nota importante

Nunca tengas dos baselines.
Prisma compara checksum por carpeta.
Eso puede volver a generar drift.

Haz los pasos y dime qué devuelve migrate resolve.
Estamos ya en el último 5%.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> npx prisma migrate resolve --applied 20260314193210_baseline
warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., prisma.config.ts).
For more information, see: https://pris.ly/prisma-config

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"

Migration 20260314193210_baseline marked as applied.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> 

Perfecto 🔥

Ya hiciste lo más importante:

Migration 20260314193210_baseline marked as applied.

Eso significa que:

_prisma_migrations volvió a existir

Prisma ahora tiene historial consistente

La DB ya está alineada con tu schema

Estamos oficialmente fuera del infierno del drift 😄

✅ Ahora haz esta prueba final

Ejecuta:

npx prisma migrate dev --name sanity_check
Debe pasar una de estas dos cosas:
🟢 Caso ideal

No detecta drift y crea una migración vacía o dice que no hay cambios.

🟡 Caso alternativo

Detecta cambios reales (si tu schema cambió desde el baseline).

Pero ya no debería pedir reset.

🧠 Qué logramos realmente

Estado anterior:

DB → tablas
_migrations → inconsistente
Local migrations → vacío

Estado actual:

DB → tablas
_migrations → alineado
Local migrations → baseline válido

Prisma ahora tiene coherencia interna.

🚨 Ahora viene la parte importante (arquitectura correcta)

Si esta base es Supabase remoto:

Nunca más uses:

npx prisma migrate dev

En remoto siempre:

npx prisma migrate deploy

Y para desarrollo usa una DB local (Docker Postgres).

💎 Recomendación profesional

Te recomiendo separar:

.env.local      → Postgres Docker (dev)
.env.production → Supabase

Y usar:

migrate dev     → local
migrate deploy  → prod

Si quieres, te armo:

docker-compose para Postgres dev

config correcta de Prisma

workflow limpio para Next + Supabase

setup profesional tipo SaaS

Primero dime:

¿El comando migrate dev --name sanity_check ya no pide reset?

Si responde bien, ya estás completamente limpio.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> npx prisma migrate dev --name sanity_check
warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., prisma.config.ts).
For more information, see: https://pris.ly/prisma-config

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.cruhgyamzwrwslaevzkx.supabase.co:5432"

Error: P3006

Migration 20260314193210_baseline failed to apply cleanly to the shadow database.
Error code: P1001
Error:
Can't reach database server at db.cruhgyamzwrwslaevzkx.supabase.co:5432

Please make sure your database server is running at db.cruhgyamzwrwslaevzkx.supabase.co:5432.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> 

Perfecto. Esto ya no es drift.
Ahora es un problema de shadow database.

El error clave es:

Migration `20260314193210_baseline` failed to apply cleanly to the shadow database.
Error code: P1001
Can't reach database server
🎯 Qué está pasando

Cuando ejecutas:

npx prisma migrate dev

Prisma hace esto internamente:

Crea una shadow database

Aplica TODAS las migraciones ahí

Compara el resultado

Luego aplica en tu DB real

Pero Supabase:

❌ No permite crear bases adicionales

❌ No permite conexiones shadow automáticamente

❌ A veces bloquea conexiones externas según red

Entonces migrate dev contra Supabase remoto siempre es mala idea.

🔥 Esto NO es error de tu migración

Es simplemente que:

migrate dev requiere shadow DB
Supabase no permite eso

✅ Soluciones Correctas

Tienes 2 opciones profesionales:

🥇 OPCIÓN RECOMENDADA — Usar DB local para desarrollo

Esta es la forma correcta.

1️⃣ Instalar Postgres local con Docker

Crea docker-compose.yml:

version: "3.8"

services:
  postgres:
    image: postgres:15
    container_name: dashboard_dev_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: dashboard_dev
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
2️⃣ Cambiar .env para desarrollo
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/dashboard_dev"
3️⃣ Ahora sí funciona migrate dev
npx prisma migrate dev

Porque ahora puede crear shadow DB sin problema.

4️⃣ En Supabase solo usar:
npx prisma migrate deploy

Nunca dev.

🥈 OPCIÓN RÁPIDA (si quieres seguir en Supabase)

Agregar shadowDatabaseUrl en tu schema.prisma:

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

Y en .env:

SHADOW_DATABASE_URL="postgresql://..."

Pero Supabase no siempre permite crear esa shadow DB.

Por eso la opción 1 es la profesional.

🚀 Arquitectura correcta
Local:
  migrate dev

Supabase (prod):
  migrate deploy

Nunca:

migrate dev → remoto
📌 Resumen

Tu baseline está bien.
Tu historial está limpio.
El error es solo porque estás usando migrate dev contra Supabase.

No vuelvas a hacerlo 😄

🎯 Recomendación final

Te recomiendo seriamente:

Docker Postgres para dev

Supabase solo como prod

CI con migrate deploy

Si quieres, te preparo:

Setup completo Next + Prisma + Docker

Config multi-env limpio

Workflow profesional tipo SaaS

¿Quieres que lo dejemos bien armado ahora?

ahora que ya en teoria tengo el schema igual que las bases puedo crear la nueva migracion?
esto tengo hoy en schema.prisma

Sí ✅ — ahora ya puedes crear nuevas migraciones, pero con una condición importante:

🔴 No debes usar migrate dev contra Supabase remoto.

Tu baseline ya está marcado como aplicado.
Tu schema está alineado.
El problema anterior era solo el shadow DB.

🎯 Entonces… ¿cómo crear una nueva migración correctamente?

Depende del entorno.

🥇 CASO CORRECTO (profesional)
👉 Desarrollo en DB local

1️⃣ Apuntas .env a Postgres local
2️⃣ Ejecutas:

npx prisma migrate dev --name add_rbac_system

3️⃣ Se genera migración nueva
4️⃣ Commit
5️⃣ En Supabase ejecutas:

npx prisma migrate deploy

Ese es el flujo correcto.

🥈 Si SOLO tienes Supabase y no DB local

Entonces no puedes usar migrate dev.

Debes

esto tengo hou en schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  directUrl    = env("DIRECT_URL")
  relationMode = "prisma"
}

model Usuario {
  id                 String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String            @unique
  tipoDocumento      TipoDocumento?    @default(DNI)
  documento          String?           @unique
  cuil               String?           @unique
  email              String            @unique
  celular            String?
  domicilio          String?
  codigoPostal       String?
  nombre             String?
  apellido           String?
  avatarUrl          String?
  fechaNacimiento    DateTime?         @db.Timestamptz(6)
  genero             Genero?
  estadoCivil        EstadoCivil?
  nacionalidad       Nacionalidad?
  password           String
  mustChangePassword Boolean           @default(false)
  rolId              Int
  deletedAt          DateTime?         @db.Timestamptz(6)
  createdAt          DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime          @default(now()) @updatedAt @db.Timestamptz(6)
  rol                Rol               @relation(fields: [rolId], references: [id])
  legajo             Legajo?
  leaveRequests      LeaveRequest[]
  vacationBalances   VacationBalance[]

  @@index([rolId])
  @@index([apellido, nombre])
}

model Legajo {
  id                  String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId           String        @unique @db.Uuid
  numeroLegajo        Int?          @unique
  fechaIngreso        DateTime?     @db.Timestamptz(6)
  fechaEgreso         DateTime?     @db.Timestamptz(6)
  estadoLaboral       EstadoLaboral @default(ACTIVO)
  tipoContrato        TipoContrato?
  puesto              String?
  area                String?
  departamento        String?
  categoria           String?
  matriculaProvincial String?
  matriculaNacional   String?
  observaciones       String?
  createdAt           DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt           DateTime      @default(now()) @updatedAt @db.Timestamptz(6)
  usuario             Usuario       @relation(fields: [usuarioId], references: [id], onDelete: Restrict)

  @@index([estadoLaboral])
  @@index([area, departamento])
}

model Rol {
  id       Int       @id @default(autoincrement())
  nombre   String    @unique
  usuarios Usuario[]
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime  @db.Timestamptz(6)
  usedAt    DateTime? @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)

  @@index([userId])
  @@index([expiresAt])
}

model PayrollReceipt {
  id                 String   @id @default(cuid())
  cuil               String
  period             String
  periodDate         DateTime @db.Timestamptz(6)
  filePath           String
  fileUrl            String
  signed             Boolean  @default(false)
  signedDisagreement Boolean  @default(false)
  observations       String?
  createdAt          DateTime @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @updatedAt @db.Timestamptz(6)

  @@unique([cuil, period])
  @@index([cuil, periodDate])
  @@map("payroll_receipts")
}

model LeaveRequest {
  id            String            @id @default(cuid())
  userId        String
  type          LeaveType
  status        LeaveStatus       @default(PENDIENTE)
  startYmd      String
  endYmd        String
  daysCount     Int
  note          String?
  approverId    String?
  decidedAt     DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  typeCatalogId Int?
  user          Usuario?          @relation(fields: [userId], references: [id])
  typeCatalog   LeaveTypeCatalog? @relation(fields: [typeCatalogId], references: [id])

  @@index([userId, createdAt])
  @@index([status, createdAt])
}

model LeaveTypeCatalog {
  id        Int            @id @default(autoincrement())
  code      LeaveType      @unique
  label     String
  colorHex  String?
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  requests  LeaveRequest[]
}

model VacationBalance {
  year      Int
  totalDays Int
  usedDays  Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  deletedAt DateTime?
  user      Usuario   @relation(fields: [userId], references: [id])

  @@unique([userId, year])
}

enum Genero {
  MASCULINO
  FEMENINO
  NO_BINARIO
  PREFIERE_NO_DECIR
  OTRO
}

enum EstadoCivil {
  SOLTERO
  CASADO
  DIVORCIADO
  VIUDO
  UNION_CONVIVENCIAL
  OTRO
}

enum Nacionalidad {
  ARGENTINA            @map("Argentina")
  BRASIL               @map("Brasil")
  URUGUAY              @map("Uruguay")
  PARAGUAY             @map("Paraguay")
  CHILE                @map("Chile")
  BOLIVIA              @map("Bolivia")
  PERU                 @map("Perú")
  ECUADOR              @map("Ecuador")
  COLOMBIA             @map("Colombia")
  VENEZUELA            @map("Venezuela")
  MEXICO               @map("México")
  GUATEMALA            @map("Guatemala")
  EL_SALVADOR          @map("El Salvador")
  HONDURAS             @map("Honduras")
  NICARAGUA            @map("Nicaragua")
  COSTA_RICA           @map("Costa Rica")
  PANAMA               @map("Panamá")
  CUBA                 @map("Cuba")
  REPUBLICA_DOMINICANA @map("República Dominicana")
  ESPANA               @map("España")
  ITALIA               @map("Italia")
  FRANCIA              @map("Francia")
  ALEMANIA             @map("Alemania")
  REINO_UNIDO          @map("Reino Unido")
  PORTUGAL             @map("Portugal")
  ESTADOS_UNIDOS       @map("Estados Unidos")
  CANADA               @map("Canadá")
  CHINA                @map("China")
  JAPON                @map("Japón")
  COREA_DEL_SUR        @map("Corea del Sur")
  INDIA                @map("India")
  RUSIA                @map("Rusia")
  UCRANIA              @map("Ucrania")
  MARRUECOS            @map("Marruecos")
  NIGERIA              @map("Nigeria")
  SUDAFRICA            @map("Sudáfrica")
  ARGELIA              @map("Argelia")
  SENEGAL              @map("Senegal")
  TURQUIA              @map("Turquía")
  ISRAEL               @map("Israel")
  AUSTRALIA            @map("Australia")
  NUEVA_ZELANDA        @map("Nueva Zelanda")
}

enum TipoTelefono {
  MOVIL
  FIJO
  LABORAL
  OTRO
}

enum TipoContrato {
  INDETERMINADO
  PLAZO_FIJO
  TEMPORAL
  PASANTIA
  MONOTRIBUTO
}

enum EstadoLaboral {
  ACTIVO
  SUSPENDIDO
  LICENCIA
  BAJA
}

enum TipoDocumento {
  DNI
  PAS
  LE
  LC
  CI
}

enum LeaveType {
  VACACIONES
  ENFERMEDAD
  CASAMIENTO
  ESTUDIOS
  EXCEDENCIA
  FALLECIMIENTO
  CON_GOCE
  SIN_GOCE
  MATERNIDAD
  NACIMIENTO
  SEMANA_EXTRA
}

enum LeaveStatus {
  PENDIENTE
  APROBADO
  RECHAZADO
  CANCELADO
}

y esto es lo que tendria que tener con las nuevas tablas:
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  
  relationMode = "prisma"
}

model Usuario {
  id            String         @id @default(uuid())
  userId        String         @unique
  tipoDocumento TipoDocumento? @default(DNI)
  documento     String?        @unique
  cuil          String?        @unique
  email         String         @unique
  celular       String?
  domicilio     String?
  codigoPostal  String?

  nombre          String?
  apellido        String?
  avatarUrl       String?
  fechaNacimiento DateTime? @db.Date
  genero          Genero?
  estadoCivil     EstadoCivil?
  nacionalidad    Nacionalidad?

  password           String
  mustChangePassword Boolean @default(false)

  rolId Int
  rol   Rol @relation(fields: [rolId], references: [id])

  legajo Legajo?

  // ✅ agregá esto
  leaveRequests      LeaveRequest[]
  vacationBalances   VacationBalance[]

  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([rolId])
  @@index([apellido, nombre])
}

model Legajo {
  id                  String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId           String        @unique @db.Uuid
  numeroLegajo        Int?          @unique
  fechaIngreso        DateTime?     @db.Timestamptz(6)
  fechaEgreso         DateTime?     @db.Timestamptz(6)
  estadoLaboral       EstadoLaboral @default(ACTIVO)
  tipoContrato        TipoContrato?
  puesto              String?
  area                String?
  departamento        String?
  categoria           String?
  matriculaProvincial String?
  matriculaNacional   String?
  observaciones       String?
  createdAt           DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt           DateTime      @default(now()) @updatedAt @db.Timestamptz(6)
  usuario             Usuario       @relation(fields: [usuarioId], references: [id], onDelete: Restrict)

  @@index([estadoLaboral])
  @@index([area, departamento])
}

model Rol {
  id         Int           @id @default(autoincrement())
  nombre     String        @unique
  descripcion String?

  usuarios   Usuario[]
  permisos   RolPermiso[]

  activo     Boolean       @default(true)

  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime  @db.Timestamptz(6)
  usedAt    DateTime? @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)

  @@index([userId])
  @@index([expiresAt])
}

model PayrollReceipt {
  id                 String   @id @default(cuid())
  cuil               String
  period             String
  periodDate         DateTime @db.Timestamptz(6)
  filePath           String
  fileUrl            String
  signed             Boolean  @default(false)
  signedDisagreement Boolean  @default(false)
  observations       String?
  createdAt          DateTime @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @updatedAt @db.Timestamptz(6)

  @@unique([cuil, period])
  @@index([cuil, periodDate])
  @@map("payroll_receipts")
}

model LeaveRequest {
  id         String      @id @default(cuid())
  userId     String
  user       Usuario?    @relation(fields: [userId], references: [id])

  type       LeaveType
  status     LeaveStatus @default(PENDIENTE)
  startYmd   String
  endYmd     String
  daysCount  Int
  note       String?
  approverId String?
  decidedAt  DateTime?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  typeCatalogId Int?
  typeCatalog   LeaveTypeCatalog? @relation(fields: [typeCatalogId], references: [id])

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([userId, startYmd])
  @@index([userId, endYmd])
  @@index([typeCatalogId])
}

model LeaveTypeCatalog {
  id        Int            @id @default(autoincrement())
  code      LeaveType      @unique
  label     String
  colorHex  String?
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  requests  LeaveRequest[]
}

enum Genero {
  MASCULINO
  FEMENINO
  NO_BINARIO
  PREFIERE_NO_DECIR
  OTRO
}

enum EstadoCivil {
  SOLTERO
  CASADO
  DIVORCIADO
  VIUDO
  UNION_CONVIVENCIAL
  OTRO
}

enum Nacionalidad {
  ARGENTINA            @map("Argentina")
  BRASIL               @map("Brasil")
  URUGUAY              @map("Uruguay")
  PARAGUAY             @map("Paraguay")
  CHILE                @map("Chile")
  BOLIVIA              @map("Bolivia")
  PERU                 @map("Perú")
  ECUADOR              @map("Ecuador")
  COLOMBIA             @map("Colombia")
  VENEZUELA            @map("Venezuela")
  MEXICO               @map("México")
  GUATEMALA            @map("Guatemala")
  EL_SALVADOR          @map("El Salvador")
  HONDURAS             @map("Honduras")
  NICARAGUA            @map("Nicaragua")
  COSTA_RICA           @map("Costa Rica")
  PANAMA               @map("Panamá")
  CUBA                 @map("Cuba")
  REPUBLICA_DOMINICANA @map("República Dominicana")
  ESPANA               @map("España")
  ITALIA               @map("Italia")
  FRANCIA              @map("Francia")
  ALEMANIA             @map("Alemania")
  REINO_UNIDO          @map("Reino Unido")
  PORTUGAL             @map("Portugal")
  ESTADOS_UNIDOS       @map("Estados Unidos")
  CANADA               @map("Canadá")
  CHINA                @map("China")
  JAPON                @map("Japón")
  COREA_DEL_SUR        @map("Corea del Sur")
  INDIA                @map("India")
  RUSIA                @map("Rusia")
  UCRANIA              @map("Ucrania")
  MARRUECOS            @map("Marruecos")
  NIGERIA              @map("Nigeria")
  SUDAFRICA            @map("Sudáfrica")
  ARGELIA              @map("Argelia")
  SENEGAL              @map("Senegal")
  TURQUIA              @map("Turquía")
  ISRAEL               @map("Israel")
  AUSTRALIA            @map("Australia")
  NUEVA_ZELANDA        @map("Nueva Zelanda")
}

enum TipoTelefono {
  MOVIL
  FIJO
  LABORAL
  OTRO
}

enum TipoContrato {
  INDETERMINADO
  PLAZO_FIJO
  TEMPORAL
  PASANTIA
  MONOTRIBUTO
}

enum EstadoLaboral {
  ACTIVO
  SUSPENDIDO
  LICENCIA
  BAJA
}

enum TipoDocumento {
  DNI
  PAS
  LE
  LC
  CI
}

enum LeaveType {
  VACACIONES
  ENFERMEDAD
  CASAMIENTO
  ESTUDIOS
  EXCEDENCIA
  FALLECIMIENTO
  CON_GOCE
  SIN_GOCE
  MATERNIDAD
  NACIMIENTO
  SEMANA_EXTRA
}

enum LeaveStatus {
  PENDIENTE
  APROBADO
  RECHAZADO
  CANCELADO
}

model VacationBalance {
  id        String   @id @default(uuid())
  userId    String
  user      Usuario  @relation(fields: [userId], references: [id])

  year      Int
  totalDays Int
  usedDays  Int      @default(0)

  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, year])
  @@index([userId])
}

model Permiso {
  id        Int      @id @default(autoincrement())
  modulo    String
  accion    String
  nombre    String?
  activo    Boolean  @default(true)

  roles     RolPermiso[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([modulo, accion])
  @@index([modulo])
  @@index([activo])
}

model RolPermiso {
  rolId     Int
  permisoId Int

  rol       Rol     @relation(fields: [rolId], references: [id], onDelete: Cascade)
  permiso   Permiso @relation(fields: [permisoId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@id([rolId, permisoId])
  @@index([permisoId])
}

decime que hago y como sigo

Perfecto. Ahora sí estamos en la parte importante 🔥
Te voy a responder como arquitecto, no como “arregla errores”.

Tu estado actual:

✅ Baseline creado y aplicado

✅ Schema alineado con la DB

❗ Estás usando Supabase remoto

❗ No tienes DB local

❗ migrate dev no sirve contra Supabase

🎯 Qué cambios reales estás haciendo

Entre el schema actual y el nuevo estás:

1️⃣ Cambiando tipos críticos

En Usuario:

Antes:

id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
fechaNacimiento DateTime? @db.Timestamptz(6)

Nuevo:

id String @id @default(uuid())
fechaNacimiento DateTime? @db.Date

⚠️ Esto es delicado:

Cambiar @db.Timestamptz → @db.Date altera tipo físico

Cambiar gen_random_uuid() → uuid() cambia default real en Postgres

Si lo haces con migrate dev, Prisma puede intentar recrear columnas.

2️⃣ Agregando sistema RBAC real

Nuevas tablas:

Permiso

RolPermiso

Nuevos campos en Rol

Esto sí es seguro.
Son tablas nuevas → no afectan datos existentes.

🧠 Estrategia Profesional Ahora

Como estás en Supabase remoto:

NO uses:

npx prisma migrate dev

Vamos a hacerlo seguro.

✅ PASO 1 — Actualiza schema.prisma

Reemplaza completamente por el nuevo schema que me pasaste.

Guarda.

✅ PASO 2 — Generar SQL manual (SIN tocar DB)

Ejecuta:

npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > rbac_update.sql

Esto hace:

Compara DB real vs nuevo schema

Genera SQL necesario

NO ejecuta nada

✅ PASO 3 — Revisa el SQL

Abre rbac_update.sql.

Verifica que:

Cree tablas Permiso y RolPermiso

Haga ALTER TABLE Rol ADD COLUMN descripcion

No haga DROP TABLE peligrosos

No haga DROP COLUMN id en Usuario

Si intenta recrear columnas sensibles → lo ajustamos manualmente.

✅ PASO 4 — Aplicar en Supabase

Copia el contenido del SQL
Pégalo en Supabase SQL Editor
Ejecuta

Ahora la base queda físicamente actualizada.

✅ PASO 5 — Crear migración vacía para mantener historial

Crea carpeta:

prisma/migrations/20260315_rbac_update/

Dentro crea:

migration.sql

Pega el mismo SQL que ejecutaste.

Luego marca como aplicada:

npx prisma migrate resolve --applied 20260315_rbac_update
🎯 Resultado

DB actualizada

Prisma alineado

Historial limpio

Sin shadow DB

Sin reset

Sin pérdida de datos

🚨 Punto crítico que quiero que confirmes

¿Tienes datos en Usuario actualmente?

Porque este cambio:

@db.Timestamptz(6) → @db.Date

Puede requerir:

ALTER TABLE "Usuario"
ALTER COLUMN "fechaNacimiento"
TYPE date
USING "fechaNacimiento"::date;

Eso está bien.
Pero Prisma a veces intenta DROP + recreate.
No queremos eso.

🏗️ Recomendación arquitectónica fuerte

Si vas a trabajar seriamente:

Instala Postgres local y deja Supabase solo como prod.

Flujo correcto:

Local → migrate dev
CI → migrate deploy
Supabase → migrate deploy

Nunca más migrar directo en remoto.

🎯 Ahora dime

Ejecuta el migrate diff y pégame aquí el SQL generado.

Lo revisamos juntos antes de tocar producción.

esto me genero el rbac.. sql
-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERE_NO_DECIR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_CONVIVENCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "Nacionalidad" AS ENUM ('Argentina', 'Brasil', 'Uruguay', 'Paraguay', 'Chile', 'Bolivia', 'Per├║', 'Ecuador', 'Colombia', 'Venezuela', 'M├®xico', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panam├í', 'Cuba', 'Rep├║blica Dominicana', 'Espa├▒a', 'Italia', 'Francia', 'Alemania', 'Reino Unido', 'Portugal', 'Estados Unidos', 'Canad├í', 'China', 'Jap├│n', 'Corea del Sur', 'India', 'Rusia', 'Ucrania', 'Marruecos', 'Nigeria', 'Sud├ífrica', 'Argelia', 'Senegal', 'Turqu├¡a', 'Israel', 'Australia', 'Nueva Zelanda');

-- CreateEnum
CREATE TYPE "TipoTelefono" AS ENUM ('MOVIL', 'FIJO', 'LABORAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('INDETERMINADO', 'PLAZO_FIJO', 'TEMPORAL', 'PASANTIA', 'MONOTRIBUTO');

-- CreateEnum
CREATE TYPE "EstadoLaboral" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'LICENCIA', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'PAS', 'LE', 'LC', 'CI');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('VACACIONES', 'ENFERMEDAD', 'CASAMIENTO', 'ESTUDIOS', 'EXCEDENCIA', 'FALLECIMIENTO', 'CON_GOCE', 'SIN_GOCE', 'MATERNIDAD', 'NACIMIENTO', 'SEMANA_EXTRA');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" DEFAULT 'DNI',
    "documento" TEXT,
    "cuil" TEXT,
    "email" TEXT NOT NULL,
    "celular" TEXT,
    "domicilio" TEXT,
    "codigoPostal" TEXT,
    "nombre" TEXT,
    "apellido" TEXT,
    "avatarUrl" TEXT,
    "fechaNacimiento" DATE,
    "genero" "Genero",
    "estadoCivil" "EstadoCivil",
    "nacionalidad" "Nacionalidad",
    "password" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "rolId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Legajo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "numeroLegajo" INTEGER,
    "fechaIngreso" TIMESTAMPTZ(6),
    "fechaEgreso" TIMESTAMPTZ(6),
    "estadoLaboral" "EstadoLaboral" NOT NULL DEFAULT 'ACTIVO',
    "tipoContrato" "TipoContrato",
    "puesto" TEXT,
    "area" TEXT,
    "departamento" TEXT,
    "categoria" TEXT,
    "matriculaProvincial" TEXT,
    "matriculaNacional" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Legajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_receipts" (
    "id" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TIMESTAMPTZ(6) NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "signedDisagreement" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDIENTE',
    "startYmd" TEXT NOT NULL,
    "endYmd" TEXT NOT NULL,
    "daysCount" INTEGER NOT NULL,
    "note" TEXT,
    "approverId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "typeCatalogId" INTEGER,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveTypeCatalog" (
    "id" SERIAL NOT NULL,
    "code" "LeaveType" NOT NULL,
    "label" TEXT NOT NULL,
    "colorHex" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveTypeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "usedDays" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "nombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" INTEGER NOT NULL,
    "permisoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_userId_key" ON "Usuario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_documento_key" ON "Usuario"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cuil_key" ON "Usuario"("cuil");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rolId_idx" ON "Usuario"("rolId");

-- CreateIndex
CREATE INDEX "Usuario_apellido_nombre_idx" ON "Usuario"("apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_usuarioId_key" ON "Legajo"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_numeroLegajo_key" ON "Legajo"("numeroLegajo");

-- CreateIndex
CREATE INDEX "Legajo_estadoLaboral_idx" ON "Legajo"("estadoLaboral");

-- CreateIndex
CREATE INDEX "Legajo_area_departamento_idx" ON "Legajo"("area", "departamento");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "payroll_receipts_cuil_periodDate_idx" ON "payroll_receipts"("cuil", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_receipts_cuil_period_key" ON "payroll_receipts"("cuil", "period");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_createdAt_idx" ON "LeaveRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_createdAt_idx" ON "LeaveRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_startYmd_idx" ON "LeaveRequest"("userId", "startYmd");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_endYmd_idx" ON "LeaveRequest"("userId", "endYmd");

-- CreateIndex
CREATE INDEX "LeaveRequest_typeCatalogId_idx" ON "LeaveRequest"("typeCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveTypeCatalog_code_key" ON "LeaveTypeCatalog"("code");

-- CreateIndex
CREATE INDEX "VacationBalance_userId_idx" ON "VacationBalance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VacationBalance_userId_year_key" ON "VacationBalance"("userId", "year");

-- CreateIndex
CREATE INDEX "Permiso_modulo_idx" ON "Permiso"("modulo");

-- CreateIndex
CREATE INDEX "Permiso_activo_idx" ON "Permiso"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_modulo_accion_key" ON "Permiso"("modulo", "accion");

-- CreateIndex
CREATE INDEX "RolPermiso_permisoId_idx" ON "RolPermiso"("permisoId");


Perfecto. Frenamos acá porque esto es crítico.

El SQL que generaste está MAL para tu caso.

🚨 Problema Grave

Ese rbac_update.sql está haciendo esto:

CREATE TABLE "Usuario" (...)
CREATE TABLE "Legajo" (...)
CREATE TABLE "Rol" (...)
...

Eso significa que Prisma comparó:

from-url → vacío
to-schema → todo el schema

O sea, cree que la base está vacía.

⚠️ Si ejecutas ese SQL en Supabase vas a romper todo porque las tablas ya existen.

🎯 Por qué pasó esto

Usaste:

npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script

En PowerShell, $DATABASE_URL no se expande como en bash.

Entonces Prisma probablemente recibió:

--from-url ""

Y comparó contra base vacía.

Por eso te generó todo el schema completo.

✅ Ahora lo hacemos bien

En Windows PowerShell debes hacer:

npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script > rbac_update.sql

O en una sola línea:

npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script > rbac_update.sql
🔥 Antes de volver a ejecutar

Confirmame esto:

En Supabase ahora mismo:

¿Existen todas las tablas actuales?

¿Tienes datos en Usuario?

¿La base NO está vacía?

Porque si la base estuviera vacía, entonces el SQL sería correcto.

🎯 Lo que debería generar correctamente

El SQL correcto debería incluir SOLO:

ALTER TABLE "Rol" ADD COLUMN descripcion

ALTER TABLE "Rol" ADD COLUMN activo

CREATE TABLE "Permiso"

CREATE TABLE "RolPermiso"

Nuevos índices

No debería incluir:

CREATE TABLE "Usuario"

CREATE TYPE Genero

etc.

🚨 Otro problema que detecté

Tu enum Nacionalidad en el SQL tiene encoding roto:

Per├║
M├®xico
Espa├▒a

Eso indica problema de encoding (UTF-8 vs Windows-1252).

Eso puede romper creación de enum.

Después lo arreglamos.

🧠 Paso correcto ahora

Borra el rbac_update.sql actual

Ejecuta el diff con $env:DATABASE_URL

Pégame el nuevo SQL

Lo revisamos antes de tocar producción

Estamos haciendo esto bien profesional.
No vamos a romper producción por apurarnos.

Ejecuta el comando corregido y mándame el nuevo resultado.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script > rbac_update.sql
warn The configuration property package.json#prisma is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., prisma.config.ts).
For more information, see: https://pris.ly/prisma-config

Error: 
option requires argument: --from-url

Usage

  $ prisma migrate diff [options]

Options

  -h, --help               Display this help message
  --config                 Custom path to your Prisma config file
  -o, --output             Writes to a file instead of stdout

From and To inputs (1 --from-... and 1 --to-... must be provided):
  --from-url               A datasource URL
  --to-url

  --from-empty             Flag to assume from or to is an empty datamodel
  --to-empty

  --from-schema-datamodel  Path to a Prisma schema file, uses the datamodel for the diff
  --to-schema-datamodel

  --from-schema-datasource Path to a Prisma schema file, uses the datasource url for the diff
  --to-schema-datasource

  --from-migrations        Path to the Prisma Migrate migrations directory
  --to-migrations

  --from-local-d1          Automatically locate the local Cloudflare D1 database
  --to-local-d1

Shadow database (only required if using --from-migrations or --to-migrations):
  --shadow-database-url    URL for the shadow database

Flags

  --script                 Render a SQL script to stdout instead of the default human readable summary (not supported on MongoDB)
  --exit-code              Change the exit code behavior to signal if the diff is empty or not (Empty: 0, Error: 1, Not empty: 2). Default behavior is Success: 0, Error: 1.

PS C:\Users\Gejol\Desktop\Next\dashboard-rbac> 

Perfecto. El error ahora es claro:

option requires argument: --from-url

Eso significa que en tu PowerShell:

$env:DATABASE_URL

está vacío.

🎯 Confirmemos eso

Ejecuta:

echo $env:DATABASE_URL

Si no imprime nada → esa variable no está cargada en el entorno de PowerShell.

⚠️ Prisma sí la lee desde .env, pero PowerShell no la exporta como variable del sistema.

✅ Solución correcta en Windows

No uses --from-url.

Usa directamente el schema como datasource.

Haz esto:

npx prisma migrate diff `
  --from-schema-datasource prisma/schema.prisma `
  --to-schema-datamodel prisma/schema.prisma `
  --script > rbac_update.sql

O en una línea:

npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > rbac_update.sql
🧠 Qué hace esto

--from-schema-datasource → usa la URL definida en tu schema (DATABASE_URL del .env)

--to-schema-datamodel → usa el nuevo schema actual

Genera el SQL real comparando DB vs nuevo schema

Esto evita el problema del env de PowerShell.

🎯 Resultado esperado

Ahora el SQL debería contener SOLO:

CREATE TABLE Permiso

CREATE TABLE RolPermiso

ALTER TABLE Rol ADD COLUMN descripcion

ALTER TABLE Rol ADD COLUMN activo

ALTER TABLE Usuario ALTER fechaNacimiento (si cambiaste a DATE)

Nuevos índices

NO debería crear Usuario, Legajo, etc.

🚨 Si vuelve a generar todo el schema

Eso significa que:

Tu DATABASE_URL apunta a otra base

O estás conectado a una base vacía

O relationMode = "prisma" está afectando el diff

En ese caso lo resolvemos diferente.

Ejecuta el comando corregido y pégame el nuevo rbac_update.sql.

Ahora sí estamos en la última parte técnica real.

-- DropForeignKey
ALTER TABLE "public"."LeaveRequest" DROP CONSTRAINT "LeaveRequest_typeCatalogId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Legajo" DROP CONSTRAINT "Legajo_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Usuario" DROP CONSTRAINT "Usuario_rolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VacationBalance" DROP CONSTRAINT "VacationBalance_userId_fkey";

-- AlterTable
ALTER TABLE "Rol" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "fechaNacimiento" SET DATA TYPE DATE,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "VacationBalance" DROP CONSTRAINT "VacationBalance_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "VacationBalance_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Permiso" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "nombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" INTEGER NOT NULL,
    "permisoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateIndex
CREATE INDEX "Permiso_modulo_idx" ON "Permiso"("modulo");

-- CreateIndex
CREATE INDEX "Permiso_activo_idx" ON "Permiso"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_modulo_accion_key" ON "Permiso"("modulo", "accion");

-- CreateIndex
CREATE INDEX "RolPermiso_permisoId_idx" ON "RolPermiso"("permisoId");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_startYmd_idx" ON "LeaveRequest"("userId", "startYmd");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_endYmd_idx" ON "LeaveRequest"("userId", "endYmd");

-- CreateIndex
CREATE INDEX "LeaveRequest_typeCatalogId_idx" ON "LeaveRequest"("typeCatalogId");

-- CreateIndex
CREATE INDEX "VacationBalance_userId_idx" ON "VacationBalance"("userId");


Excelente. Ahora sí tenemos el diff real.
Y te voy a decir exactamente qué hacer y qué NO hacer.

🚨 Parte Peligrosa del SQL

Hay cosas correctas y cosas peligrosas.

🔴 1️⃣ Cambio de tipo en Usuario.id
ALTER TABLE "Usuario"
DROP CONSTRAINT "Usuario_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
...
ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id");

Tu base hoy tiene:

UUID

Y el nuevo schema tiene:

id String @default(uuid())

Eso hace que Prisma quiera convertir UUID → TEXT.

⚠️ Eso es innecesario y peligroso.

🔴 2️⃣ Cambio de tipo en VacationBalance.userId
ALTER COLUMN "userId" SET DATA TYPE TEXT

Antes era UUID.
Ahora quiere TEXT.

Eso rompe integridad referencial si no se hace con USING.

🟡 3️⃣ Cambio válido
ALTER COLUMN "fechaNacimiento" SET DATA TYPE DATE

Esto está bien.
Pero debería ser:

USING "fechaNacimiento"::date
🎯 Diagnóstico Arquitectónico

El problema no es el RBAC.
El problema es que cambiaste:

@db.Uuid  →  sin @db.Uuid

Eso hace que Prisma piense que debe convertir UUID físico a TEXT.

🧠 Decisión Profesional

Te recomiendo FUERTEMENTE:

👉 NO cambies UUID a TEXT
👉 Mantén @db.Uuid
👉 Mantén @default(dbgenerated("gen_random_uuid()"))

Porque:

Ya está en producción

No ganas nada cambiándolo

Evitas migración destructiva

✅ Lo que deberías hacer ahora
1️⃣ Vuelve a dejar Usuario así:
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

Y en VacationBalance:

id String @id @default(uuid()) @db.Uuid
userId String @db.Uuid

Mantén UUID físico.

2️⃣ Solo cambia lo necesario

Mantén solo:

Nuevas tablas Permiso

RolPermiso

Nuevos campos en Rol

Nuevos índices en LeaveRequest

fechaNacimiento @db.Date si realmente lo quieres

🎯 Luego vuelve a generar el diff

Después de corregir los UUID, ejecuta otra vez:

npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > rbac_update.sql
🎯 El SQL correcto debería quedar así:

Debe incluir SOLO:

ALTER TABLE "Rol" ADD COLUMN descripcion;
ALTER TABLE "Rol" ADD COLUMN activo;
ALTER TABLE "Rol" ADD COLUMN createdAt;
ALTER TABLE "Rol" ADD COLUMN updatedAt;

CREATE TABLE "Permiso" (...);
CREATE TABLE "RolPermiso" (...);

ALTER TABLE "Usuario"
ALTER COLUMN "fechaNacimiento" TYPE DATE USING "fechaNacimiento"::date;

Y nada más.

NO debe:

Drop primary keys

Cambiar UUID a TEXT

Drop foreign keys

Rehacer tablas existentes

🚨 Si ejecutas el SQL actual

Podrías:

Romper FKs

Invalidar UUID

Corromper relaciones

Generar downtime

No lo ejecutes aún.

🏗️ Conclusión Profesional

Tu baseline está bien.
Tu proceso es correcto.
Solo estamos limpiando cambios innecesarios.

Esto es exactamente lo que hace un senior backend cuando migra producción:
Eliminar cambios destructivos del diff.

🎯 Próximo paso

Corrige el schema para mantener UUID físicos
Regenera el diff
Pégame el nuevo SQL

Y lo validamos antes de tocar Supabase.

Estamos a nada de cerrar esto limpio y profesional.

-- DropForeignKey
ALTER TABLE "public"."LeaveRequest" DROP CONSTRAINT "LeaveRequest_typeCatalogId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Legajo" DROP CONSTRAINT "Legajo_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Usuario" DROP CONSTRAINT "Usuario_rolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VacationBalance" DROP CONSTRAINT "VacationBalance_userId_fkey";

-- AlterTable
ALTER TABLE "Rol" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "fechaNacimiento" SET DATA TYPE DATE,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "nombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" INTEGER NOT NULL,
    "permisoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateIndex
CREATE INDEX "Permiso_modulo_idx" ON "Permiso"("modulo");

-- CreateIndex
CREATE INDEX "Permiso_activo_idx" ON "Permiso"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_modulo_accion_key" ON "Permiso"("modulo", "accion");

-- CreateIndex
CREATE INDEX "RolPermiso_permisoId_idx" ON "RolPermiso"("permisoId");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_startYmd_idx" ON "LeaveRequest"("userId", "startYmd");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_endYmd_idx" ON "LeaveRequest"("userId", "endYmd");

-- CreateIndex
CREATE INDEX "LeaveRequest_typeCatalogId_idx" ON "LeaveRequest"("typeCatalogId");

-- CreateIndex
CREATE INDEX "VacationBalance_userId_idx" ON "VacationBalance"("userId");


Perfecto. Ahora estamos muy cerca, pero todavía hay algo que NO debes ejecutar así como está.

Te explico exactamente qué está bien y qué hay que ajustar.

✅ Lo que está bien

✔ Agregar columnas en Rol
✔ Crear tablas Permiso
✔ Crear tabla RolPermiso
✔ Crear índices nuevos
✔ Cambiar fechaNacimiento a DATE

Todo eso está correcto.

🚨 Lo que está MAL (muy importante)

Al inicio del script tienes:

-- DropForeignKey
ALTER TABLE "public"."LeaveRequest" DROP CONSTRAINT "LeaveRequest_typeCatalogId_fkey";

ALTER TABLE "public"."Legajo" DROP CONSTRAINT "Legajo_usuarioId_fkey";

ALTER TABLE "public"."Usuario" DROP CONSTRAINT "Usuario_rolId_fkey";

ALTER TABLE "public"."VacationBalance" DROP CONSTRAINT "VacationBalance_userId_fkey";

❗ Esto elimina todas tus claves foráneas.

Y luego el script NO las vuelve a crear.

Si ejecutas esto:

Pierdes integridad referencial

Dejas tablas sin FKs

Producción queda inconsistente

Eso no lo queremos.

🎯 Qué debes hacer ahora
🔥 Elimina completamente esta parte del SQL:
-- DropForeignKey ...

No necesitas tocar las FKs.
No estás cambiando relaciones.
Prisma a veces las sugiere por cambios de tipos o relationMode.

Pero en tu caso no es necesario.

⚠ Sobre el cambio a DATE

Actualmente tienes:

ALTER TABLE "Usuario"
ALTER COLUMN "fechaNacimiento" SET DATA TYPE DATE

Debería ser más seguro así:

ALTER TABLE "Usuario"
ALTER COLUMN "fechaNacimiento"
TYPE DATE
USING "fechaNacimiento"::date;

Eso garantiza que convierte bien si hay datos.

🎯 El SQL final que SÍ puedes ejecutar

Debe quedar así:

ALTER TABLE Rol ADD columnas

ALTER TABLE Usuario cambiar fechaNacimiento (con USING)

CREATE TABLE Permiso

CREATE TABLE RolPermiso

CREATE índices nuevos

Nada más.

Sin DROP FK.
Sin DROP PK.
Sin cambios de UUID.
Sin ALTER id.

🧠 Por qué Prisma quería borrar FKs

Porque cambiaste:

relationMode = "prisma"

Cuando usas relationMode = "prisma":

Prisma no depende físicamente de FKs

Pero si existen, el diff a veces intenta tocarlas

En producción con Supabase, lo mejor es:

relationMode = "foreignKeys"

Pero eso lo vemos después.

🚀 Flujo final correcto

Limpia el SQL (quita los DROP FK)

Ajusta el ALTER fechaNacimiento con USING

Ejecuta en Supabase SQL Editor

Crea carpeta de migración nueva

Pega el mismo SQL en migration.sql

Ejecuta:

npx prisma migrate resolve --applied 20260315_rbac_update
🎯 Pregunta importante

¿Tu tabla Usuario tiene datos actualmente en fechaNacimiento?

Si sí → usamos USING como te dije.
Si no → el ALTER simple funciona igual.

Estamos a un paso de dejar tu sistema RBAC en producción correctamente y con historial limpio.

Confírmame lo de los datos y te doy el SQL final listo para pegar.

Error: Failed to run sql query: ERROR: 23502: column "updatedAt" of relation "Rol" contains null values

Perfecto. Este error es 100% lógico y es bueno que haya salido antes en producción.

El error:

ERROR: 23502: column "updatedAt" of relation "Rol" contains null values

Significa:

👉 Estás agregando una columna updatedAt TIMESTAMP NOT NULL
👉 Pero la tabla Rol ya tiene filas
👉 PostgreSQL no puede crear una columna NOT NULL sin valor para registros existentes

🎯 Por qué pasó

Tu SQL tenía:

ALTER TABLE "Rol"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;

Eso falla porque las filas existentes quedan con NULL.

✅ Solución Correcta (migración segura en producción)

Cuando agregas columnas NOT NULL en tablas con datos, el patrón profesional es:

🥇 Método Seguro en 3 pasos
1️⃣ Agregar columna permitiendo NULL
ALTER TABLE "Rol"
ADD COLUMN "updatedAt" TIMESTAMP(3);
2️⃣ Poblar datos existentes
UPDATE "Rol"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;
3️⃣ Hacerla NOT NULL
ALTER TABLE "Rol"
ALTER COLUMN "updatedAt" SET NOT NULL;
🔥 Lo mismo aplica para createdAt

Si también agregaste:

ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

Ese sí funciona porque tiene DEFAULT.

Pero si no tiene DEFAULT → debes hacer el mismo patrón.

🎯 SQL Final Correcto para Rol

Usa esto:

ALTER TABLE "Rol"
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "descripcion" TEXT;

ALTER TABLE "Rol"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Rol"
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Rol"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "Rol"
ALTER COLUMN "updatedAt" SET NOT NULL;
🚀 Por qué esto es correcto

Porque:

No rompe datos existentes

No bloquea la tabla innecesariamente

No requiere downtime

Es patrón estándar en migraciones productivas

🧠 Nota Importante

Cuando agregues columnas NOT NULL en producción:

Siempre piensa:

¿La tabla ya tiene datos?

Si sí → nunca agregues NOT NULL directo sin default o sin backfill.

🎯 Próximo paso

Ajusta el SQL con el patrón anterior

Ejecuta en Supabase

Si pasa sin error → seguimos con creación de tablas RBAC

Si quieres, pásame el SQL final que vas a ejecutar y lo validamos antes de correrlo.

Estamos haciendo esto correctamente nivel senior backend.

listo ya cree todo en sql

Excelente 🔥
Si ya ejecutaste el SQL en Supabase y no dio errores, entonces ahora estamos en la última parte: alinear Prisma con el estado real de la base.

Ahora mismo tu estado es:

DB → ya tiene RBAC físico creado
Prisma → todavía no tiene esa migración registrada

Si no registramos la migración, más adelante Prisma va a detectar drift otra vez.

✅ PASO FINAL (muy importante)
1️⃣ Crea carpeta de migración manual

En tu proyecto:

prisma/migrations/20260315_rbac_update/

Dentro crea:

migration.sql

Y pega EXACTAMENTE el SQL que ejecutaste en Supabase
(la versión limpia, sin DROP FK y con el fix de updatedAt).

2️⃣ Marca la migración como aplicada

Ahora ejecuta:

npx prisma migrate resolve --applied 20260315_rbac_update

Esto:

NO ejecuta nada

Solo registra en _prisma_migrations

Mantiene el historial consistente

3️⃣ Verificación final

Ejecuta:

npx prisma migrate status

Debe decir algo como:

Database schema is up to date

Y NO debe pedir reset.

🎯 Después de esto

Tu sistema queda:

✅ Baseline limpio

✅ RBAC agregado correctamente

✅ Historial consistente

✅ Sin drift

✅ Sin shadow DB

✅ Sin pérdida de datos

🧠 Recomendación Profesional (muy importante)

Ahora que ya sobreviviste a esto 😄

Te recomiendo fuertemente:

Instalar Postgres local para desarrollo

Y usar este flujo siempre:

Local → migrate dev
Supabase → migrate deploy

Nunca más migrate dev contra Supabase.

Si quieres, el siguiente paso lógico sería:

Seed automático de permisos base

Script para crear rol ADMIN con todos los permisos

Guard + middleware RBAC en backend

Protección de rutas en Next

Dime qué quieres armar ahora y lo diseñamos bien arquitectónico 🔥
