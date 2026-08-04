# AGENTS.md

## Objetivo del proyecto

Este sistema debe desarrollarse con una arquitectura limpia, modular y mantenible.
Antes de crear código nuevo, revisar el código existente y respetar la estructura actual si es válida.

El desarrollo debe priorizar:

* Separación de responsabilidades.
* Reutilización de componentes.
* Evitar duplicidad de código.
* Uso consistente de Tailwind CSS.
* Uso de componentes shadcn/ui.
* Respeto estricto de la identidad visual definida.
* Código claro, tipado y mantenible.

---

## Reglas generales de trabajo

Antes de modificar archivos:

1. Revisar el código existente.
2. Detectar patrones actuales.
3. Identificar duplicidad de código.
4. Verificar si existen componentes, hooks, helpers o services reutilizables.
5. Proponer cambios antes de hacer refactors grandes.
6. No romper lógica existente.
7. No cambiar reglas de negocio sin justificación.
8. No eliminar código dudoso sin antes comentarlo o marcarlo como posible código muerto.

---

## Arquitectura y organización

El código debe estar separado por responsabilidades.

Usar, cuando corresponda, carpetas como:

```txt
src/
├─ app/
├─ components/
│  ├─ ui/
│  ├─ layout/
│  ├─ shared/
│  └─ forms/
├─ features/
│  └─ nombre-funcionalidad/
│     ├─ components/
│     ├─ hooks/
│     ├─ helpers/
│     ├─ services/
│     ├─ types/
│     ├─ schemas/
│     └─ constants/
├─ hooks/
├─ lib/
├─ helpers/
├─ services/
├─ types/
├─ constants/
└─ styles/
```

Cada funcionalidad nueva debe agruparse preferentemente dentro de `features` o `modules`.

Evitar:

* Componentes demasiado grandes.
* Lógica de negocio dentro de componentes visuales.
* Funciones repetidas.
* Estilos hardcodeados sin criterio.
* Duplicación de formularios, tablas, cards, botones o layouts.
* Mezclar llamadas a API directamente en componentes visuales si puede separarse en services o hooks.

---

## Componentes UI

Usar shadcn/ui como base principal para la interfaz.

Priorizar componentes shadcn para:

* Button
* Input
* Select
* Dialog
* Sheet
* Card
* Table
* Badge
* Tabs
* DropdownMenu
* Form
* Calendar
* Toast
* Alert
* Skeleton

Usar Tailwind CSS para estilos.

No crear componentes visuales desde cero si existe un componente shadcn adecuado.

Crear componentes reutilizables para:

* Layouts
* Headers
* Sidebars
* Cards
* Formularios
* Tablas
* Filtros
* Modales
* Estados vacíos
* Estados de carga
* Mensajes de error
* Badges de estado
* Botones de acción

### Patrón obligatorio para pastillas de estado

Todas las pastillas o badges de estado de la aplicación deben utilizar un único
componente reutilizable y conservar exactamente el mismo patrón visual:

* Misma altura.
* Mismo padding horizontal y vertical.
* Misma tipografía, tamaño y peso de fuente.
* Mismo radio de borde.
* Mismo grosor de borde.
* Misma alineación entre icono y texto, cuando corresponda.

Entre estados solamente puede cambiar la combinación semántica de colores de
texto, fondo y borde. El texto o la longitud de su contenido no debe alterar el
tamaño vertical de la pastilla. No crear variantes locales con dimensiones o
tipografías diferentes; extender el componente compartido cuando aparezca un
nuevo estado.

### Patrón obligatorio para pantallas principales

Todas las pantallas principales de administración deben seguir el patrón visual
y de interacción compartido utilizado por la pantalla de Establecimientos:

* Contenedor de página, fondo y espaciados comunes.
* Encabezado con icono, título, descripción informativa, separador y acción
  principal en la misma ubicación.
* Distribución en dos columnas cuando exista listado y detalle.
* Buscador y botón de filtros reutilizables, con las mismas dimensiones, colores
  e iconografía.
* Cards de listado reutilizables con icono o avatar, título, descripción,
  metadatos, pastillas y selección consistentes.
* Panel de detalle reutilizable con encabezado, campos, separadores y barra de
  acciones comunes.
* Estados de carga, vacío y error compartidos.
* Paginación mediante la constante global definida para catálogos.

No crear versiones locales de estos elementos si existe el componente
compartido. Las diferencias entre módulos deben limitarse al contenido, las
acciones permitidas y los colores semánticos de estado.

---

## Identidad visual

Todo el diseño debe respetar esta paleta:

```txt
Verde principal:   #1D4F36
Verde secundario: #819B56
Gris neutro:      #B2B2B2
Negro:            #000000
```

La estética debe ser:

* Institucional.
* Sobria.
* Limpia.
* Moderna.
* Clara.
* Consistente.

Aplicar la paleta en:

* Botones principales.
* Sidebar.
* Headers.
* Cards.
* Bordes.
* Badges.
* Estados activos.
* Hover states.
* Iconografía.
* Fondos.
* Tablas.
* Formularios.

Evitar colores fuera de marca salvo para estados funcionales como error, warning o success.
Si se usan, deben integrarse visualmente sin romper la identidad del sistema.

---

## Tipografía

La tipografía principal del sistema debe ser Roboto.

Si el proyecto usa Next.js, configurar Roboto con `next/font/google`.

Ejemplo:

```ts
import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});
```

Aplicar la tipografía de forma global.

---

## Manual de marca

El proyecto puede incluir un manual de marca en PDF dentro de:

```txt
docs/manual-marca.pdf
```

También puede existir un resumen en Markdown en:

```txt
docs/brand-guidelines.md
```

Al trabajar sobre diseño visual:

1. Revisar el manual de marca.
2. Respetar iconografía, tipografía, colores, espaciados y criterios visuales.
3. No deformar logos.
4. No inventar variantes visuales si el manual ya define una regla.
5. No usar colores ajenos a la marca salvo casos funcionales justificados.
6. Mantener consistencia visual entre pantallas.

---

## Revisión del código existente

Antes de desarrollar una funcionalidad nueva, verificar:

* Si ya existe un componente similar.
* Si ya existe un hook reutilizable.
* Si ya existe un helper o service aplicable.
* Si hay lógica duplicada.
* Si hay estilos repetidos.
* Si hay código muerto.
* Si hay imports innecesarios.
* Si hay nombres poco claros.
* Si hay archivos demasiado grandes.
* Si hay componentes que deberían dividirse.
* Si la lógica está mezclada con la presentación.
* Si se está usando Tailwind correctamente.
* Si se están usando componentes shadcn/ui correctamente.
* Si la paleta está centralizada o repetida manualmente.

---

## Desarrollo nuevo

Toda nueva funcionalidad debe cumplir estas reglas:

* Estar separada por módulo o feature.
* Usar componentes shadcn/ui.
* Usar Tailwind CSS.
* Respetar la paleta definida.
* Usar Roboto.
* Evitar duplicación.
* Tener tipos claros.
* Separar lógica de presentación.
* Usar hooks para estado o lógica reutilizable.
* Usar helpers para funciones puras.
* Usar services para llamadas a APIs o lógica de datos.
* Usar schemas para formularios o validaciones.
* Mantener UI consistente con el manual de marca.

---

## Formularios

Para formularios:

* Usar componentes shadcn/ui.
* Usar schemas si el proyecto ya utiliza Zod u otra librería de validación.
* Separar validaciones de la UI.
* Mostrar mensajes de error claros.
* Evitar duplicar lógica de formularios.
* Reutilizar inputs, selects y wrappers cuando corresponda.

---

## Tablas y listados

Para tablas:

* Usar componentes consistentes.
* Separar columnas, filtros y acciones.
* Evitar lógica compleja dentro del JSX.
* Crear componentes reutilizables para acciones frecuentes.
* Incluir estados de carga, vacío y error.
* Mantener diseño sobrio e institucional.

---

## Llamadas a API y datos

Evitar llamadas a API directamente mezcladas dentro de componentes visuales.

Preferir:

```txt
services/
hooks/
lib/
```

Ejemplo esperado:

```txt
features/activities/
├─ services/activities.service.ts
├─ hooks/useActivities.ts
├─ components/ActivitiesTable.tsx
├─ components/ActivityForm.tsx
├─ types/activity.types.ts
└─ schemas/activity.schema.ts
```

---

## Refactor

Los refactors deben ser incrementales.

Permitido:

* Extraer componentes reutilizables.
* Extraer hooks.
* Extraer helpers.
* Ordenar imports.
* Eliminar duplicidad evidente.
* Mejorar nombres.
* Centralizar constantes.
* Mejorar estructura visual sin cambiar reglas de negocio.

Evitar:

* Reescribir todo sin necesidad.
* Cambiar lógica funcional sin explicación.
* Borrar código dudoso sin marcarlo.
* Cambiar estructura completa sin justificar.
* Introducir librerías nuevas sin necesidad.

## Patrones permanentes del proyecto

* Las ediciones deben ser diferenciales: un cambio visual o informativo no debe regenerar horarios, clases, cupos, reservas ni relaciones operativas.
* Las tarjetas selectoras de listados deben conservar altura natural y uniforme: nunca deben estirarse para completar el alto disponible de un `grid` o contenedor. Usar `AdminListCard` con alineación al inicio (`self-start`/`content-start`), la misma geometría, tipografía, avatar, pastillas y espaciados del listado de Ciudadanos. La información visible debe limitarse a la mínima necesaria para identificar el registro; los datos ampliados pertenecen al panel derecho.
* Solo propagar o regenerar datos derivados cuando cambie el campo que realmente los determina.
* Los encabezados de altas, ediciones y workflows deben conservar el patrón visual compartido: avatar o icono a la izquierda, título, descripción con icono informativo y separador sutil.
* Reutilizar los mismos componentes para buscadores, filtros, tarjetas, estados, botones, cargas, vacíos, avatares y pastillas en todas las pantallas equivalentes.
* Todas las pantallas de alta, edición o carga que se abran en una ruta propia deben seguir el patrón visual de Alta de establecimiento: ancho completo disponible, encabezado compartido con icono, título, descripción con icono informativo y separador; `AdminFormCard` como contenedor principal; grilla y espaciados consistentes; controles reutilizables con icono; fondo de marca; y barra de acciones al pie inmediatamente después del último control. No crear variantes visuales particulares para formularios equivalentes.
* Todas las pantallas de alta, edición o carga que se abran en una ruta propia deben seguir el patrón visual de Alta de establecimiento: ancho completo disponible, encabezado compartido con icono, título, descripción con icono informativo y separador; `AdminFormCard` como contenedor principal; grilla y espaciados consistentes; controles reutilizables con icono; fondo de marca; y barra de acciones al pie inmediatamente después del último control. No crear variantes visuales particulares para formularios equivalentes.

---

* Las pantallas deben resolver en conjunto todos los datos necesarios antes de mostrar su contenido. Mientras exista una carga inicial pendiente, mostrar únicamente el estado de carga de página completa; no renderizar parcialmente títulos, buscadores, filtros, tarjetas ni detalles.

## Resultado esperado en cada tarea

Antes de aplicar cambios grandes, entregar:

1. Diagnóstico breve.
2. Archivos detectados.
3. Problemas encontrados.
4. Propuesta de cambios.
5. Impacto esperado.

Después de modificar, entregar:

1. Qué se cambió.
2. Qué archivos se tocaron.
3. Por qué se modificó.
4. Qué se reutilizó.
5. Qué quedó pendiente, si aplica.

---

## Reglas de ejecución local

- No ejecutar `npm run dev` automáticamente al finalizar tareas.
- No levantar servidores de desarrollo sin autorización.
- No usar el puerto 3002.
- No ejecutar `npm run build` automáticamente al finalizar tareas. Ejecutarlo únicamente si el usuario lo solicita expresamente.
<!-- - El puerto local del proyecto es 3000.
- Para validar cambios usar `npm run build` y, si existe, `npm run lint`.
- Si el puerto 3000 está ocupado, informar el PID en vez de usar otro puerto. -->

## Convención de rutas

- Todas las nuevas rutas de interfaz deben nombrarse en inglés y mantener un criterio lingüístico consistente.
- Usar segmentos descriptivos en `kebab-case` y reservar los nombres en español para textos visibles al usuario.

## Comunicación de resultados

- Al finalizar una tarea, responder de forma breve y sin detallar los cambios realizados, salvo que el usuario solicite ese detalle.

---


## Regla final

No desarrollar de forma improvisada.

Primero revisar, después proponer, y luego implementar de forma ordenada, modular y consistente.
