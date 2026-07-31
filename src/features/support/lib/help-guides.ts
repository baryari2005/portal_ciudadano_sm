export type HelpPermission = { modulo: string; accion: string };
export type HelpPermissionMode = "all" | "any";
export type HelpCategory = "citizen" | "teacher" | "reception" | "administration";

export type HelpLink = {
  label: string;
  href: string;
  permission?: HelpPermission;
};

export type HelpGuide = {
  id: string;
  category: HelpCategory;
  title: string;
  description: string;
  order: number;
  requiredPermissions?: HelpPermission[];
  permissionMode?: HelpPermissionMode;
  steps: string[];
  warnings?: string[];
  links?: HelpLink[];
  keywords: string[];
};

const permission = (modulo: string, accion: string): HelpPermission => ({ modulo, accion });

export const HELP_CATEGORY_META: Record<HelpCategory, { label: string; description: string; order: number }> = {
  citizen: { label: "Portal Ciudadano", description: "Cuenta, actividades, inscripciones, agenda, asistencias y QR.", order: 10 },
  teacher: { label: "Portal del Profesor", description: "Clases asignadas y toma de asistencia.", order: 20 },
  reception: { label: "Recepción", description: "Control de ingreso por QR o búsqueda manual.", order: 30 },
  administration: { label: "Administración", description: "Configuración y operación integral de actividades.", order: 40 },
};

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: "citizen-registration-access", category: "citizen", order: 10,
    title: "Registrarte e ingresar", description: "Datos requeridos, aprobación de la cuenta e inicio de sesión.",
    keywords: ["registro", "cuenta", "acceso", "contraseña", "perfil"],
    steps: [
      "Desde el inicio de sesión elegí Solicitar acceso.",
      "Completá nombre, apellido, DNI, domicilio, email, teléfono, fecha de nacimiento, usuario y contraseña.",
      "Enviá la solicitud. La cuenta queda pendiente hasta que un administrador la habilite.",
      "Ingresá con tus credenciales para consultar el estado. Si se rechaza, verás el motivo y podrás corregir los datos y reenviar.",
      "Cuando esté activa, iniciá sesión y elegí Portal Ciudadano.",
      "Usá Mi perfil para actualizar teléfono y domicilio. La recuperación de contraseña está disponible desde el inicio de sesión.",
    ],
    warnings: ["La solicitud no habilita el ingreso inmediatamente: requiere aprobación administrativa."],
    links: [{ label: "Solicitar acceso", href: "/request-access" }, { label: "Consultar estado", href: "/request-access/status" }, { label: "Mi perfil", href: "/citizen/profile" }],
  },
  {
    id: "citizen-find-activities", category: "citizen", order: 20,
    title: "Buscar actividades y horarios", description: "Cómo consultar la oferta disponible antes de inscribirte.",
    keywords: ["actividad", "buscar", "horario", "cupo", "precio", "edad", "requisito"],
    steps: [
      "Abrí Actividades y escribí parte del nombre o descripción en el buscador.",
      "Entrá al detalle para consultar descripción, categoría, gratuidad o precio y requisitos.",
      "Revisá cada horario: día, hora, establecimiento, espacio, profesores y lugares disponibles.",
      "Si no quedan lugares, el botón ofrece lista de espera solamente cuando el horario la permite.",
    ],
    warnings: ["La edad se calcula con tu fecha de nacimiento al momento de inscribirte; los límites son inclusivos.", "El sistema informa precios, pero no incluye un circuito de pago."],
    links: [{ label: "Ver actividades", href: "/citizen/activities" }],
  },
  {
    id: "citizen-enrollment", category: "citizen", order: 30,
    title: "Inscribirte o cancelar", description: "Confirmación, lista de espera, documentación y baja voluntaria.",
    keywords: ["inscripción", "cancelar", "baja", "lista de espera", "documentación"],
    steps: [
      "Elegí una actividad y luego el horario que querés cursar.",
      "Presioná Inscribirme. Con cupo disponible queda confirmada; sin cupo puede pasar a lista de espera.",
      "Consultá Mis inscripciones para ver estado, posición y documentación requerida.",
      "Cargá la documentación solicitada desde el enlace de la inscripción cuando corresponda.",
      "Podés cancelar una inscripción confirmada, pendiente o en lista de espera. Si liberás un cupo, la primera persona en espera se promueve automáticamente.",
    ],
    warnings: ["No se permiten dos inscripciones activas al mismo horario.", "Los requisitos se informan, pero hoy no impiden automáticamente la confirmación inicial."],
    links: [{ label: "Mis inscripciones", href: "/citizen/enrollments" }, { label: "Buscar actividades", href: "/citizen/activities" }],
  },
  {
    id: "citizen-schedule-attendance", category: "citizen", order: 40,
    title: "Agenda y asistencias", description: "Diferencia entre inscripción, próxima clase y asistencia registrada.",
    keywords: ["agenda", "clase", "asistencia", "presente", "ausente"],
    steps: [
      "Mis inscripciones muestra el vínculo estable con un horario semanal y su estado.",
      "Próximas clases muestra fechas concretas generadas para horarios donde tu inscripción está confirmada.",
      "Mi asistencia muestra los registros de clases ya procesadas: presente, ausente o justificada.",
    ],
    warnings: ["Si un horario todavía no tiene clases generadas, no aparecerá en Próximas clases aunque la inscripción esté confirmada."],
    links: [{ label: "Próximas clases", href: "/citizen/schedule" }, { label: "Mis asistencias", href: "/citizen/attendance" }],
  },
  {
    id: "citizen-qr", category: "citizen", order: 50,
    title: "Usar tu credencial QR", description: "Emisión, uso seguro, revocación y reemisión.",
    keywords: ["qr", "credencial", "reemitir", "revocar", "ingreso"],
    steps: [
      "Abrí Mi QR y emití la credencial si todavía no tenés una activa.",
      "Mostrala en recepción para validar un ingreso o al profesor para registrar asistencia en una clase seleccionada.",
      "Si deja de ser segura, revocala. Luego podés emitir una credencial nueva.",
    ],
    warnings: ["No compartas capturas ni el contenido de tu QR. Una credencial revocada deja de ser válida."],
    links: [{ label: "Abrir Mi QR", href: "/citizen/qr" }],
  },
  {
    id: "teacher-assignment", category: "teacher", order: 10,
    title: "Asignación y consulta de clases", description: "Cómo llega un profesor a sus horarios y clases.",
    requiredPermissions: [permission("activity_schedules", "ver"), permission("activity_sessions", "ver"), permission("enrollments", "ver")], permissionMode: "all",
    keywords: ["profesor", "asignación", "horario", "clase", "alumnos"],
    steps: [
      "Un administrador crea o vincula tu perfil de profesor con tu usuario.",
      "El administrador te asigna como profesor principal o adicional de un horario; no existe autoasignación.",
      "Mis horarios muestra las asignaciones vigentes y la próxima clase generada.",
      "Mis clases permite abrir una fecha concreta y consultar los alumnos confirmados.",
    ],
    warnings: ["Una asignación al horario no crea fechas por sí sola: administración debe generar las clases programadas."],
    links: [{ label: "Mis horarios", href: "/teacher/schedules", permission: permission("activity_schedules", "ver") }, { label: "Mis clases", href: "/teacher/sessions", permission: permission("activity_sessions", "ver") }],
  },
  {
    id: "teacher-manual-attendance", category: "teacher", order: 20,
    title: "Tomar asistencia manual", description: "Marcar alumnos, guardar y cerrar la planilla.",
    requiredPermissions: [permission("attendance", "ver"), permission("attendance", "asignar")], permissionMode: "all",
    keywords: ["asistencia", "manual", "cerrar", "reabrir", "ausente", "justificada"],
    steps: [
      "Abrí una clase asignada y entrá a su planilla.",
      "Marcá cada inscripción como presente, ausente o justificada; la justificación requiere un motivo.",
      "Guardá los cambios. Las acciones masivas no aceptan inscripciones repetidas ni de otro horario.",
      "Cerrá la planilla cuando termine la revisión. Los alumnos sin marca quedan ausentes.",
      "La reapertura sólo aparece para quien tenga el permiso correspondiente.",
    ],
    warnings: ["Una planilla cerrada no admite cambios hasta ser reabierta.", "No se toma asistencia en clases suspendidas o canceladas."],
    links: [{ label: "Abrir clases", href: "/teacher/sessions", permission: permission("activity_sessions", "ver") }],
  },
  {
    id: "teacher-qr-attendance", category: "teacher", order: 30,
    title: "Tomar asistencia mediante QR", description: "Escanear credenciales dentro de la clase correcta.",
    requiredPermissions: [permission("attendance", "ver"), permission("attendance", "asignar")], permissionMode: "all",
    keywords: ["qr", "escanear", "asistencia", "duplicado", "inválido"],
    steps: [
      "Abrí la clase asignada y elegí la opción de asistencia QR.",
      "Habilitá la cámara y mantené seleccionada la clase correcta.",
      "Escaneá la credencial del alumno. El sistema valida vigencia, inscripción confirmada y pertenencia a ese horario.",
      "Revisá el resultado antes de continuar con la siguiente persona y cerrá la planilla al finalizar.",
    ],
    warnings: ["Un QR inválido, revocado o de una persona no inscripta no registra asistencia.", "Repetir un QR actualiza el mismo registro; no crea dos asistencias."],
    links: [{ label: "Abrir clases", href: "/teacher/sessions", permission: permission("activity_sessions", "ver") }],
  },
  {
    id: "reception-qr-access", category: "reception", order: 10,
    title: "Controlar ingreso mediante QR", description: "Validación de identidad, clase, sede y ventana horaria.",
    requiredPermissions: [permission("access", "ver"), permission("access", "crear")], permissionMode: "all",
    keywords: ["recepción", "acceso", "qr", "cámara", "ingreso"],
    steps: [
      "Ingresá a Control de ingreso y seleccioná el establecimiento.",
      "Abrí Escanear QR, habilitá la cámara y ubicá la credencial dentro del marco.",
      "El sistema comprueba usuario activo, inscripción confirmada, clase del día, establecimiento y margen horario.",
      "Revisá si el ingreso fue permitido o rechazado y el motivo informado.",
    ],
    warnings: ["Este circuito registra acceso al establecimiento; no crea una asistencia de clase."],
    links: [{ label: "Escanear QR", href: "/access/scan", permission: permission("access", "ver") }, { label: "Ver historial", href: "/access/history", permission: permission("access", "ver") }],
  },
  {
    id: "reception-manual-access", category: "reception", order: 20,
    title: "Buscar y registrar un ingreso manual", description: "Alternativa cuando la persona no puede presentar su QR.",
    requiredPermissions: [permission("access", "ver"), permission("access", "crear"), permission("access", "asignar")], permissionMode: "all",
    keywords: ["búsqueda", "manual", "dni", "nombre", "apellido", "autorizar"],
    steps: [
      "Seleccioná el establecimiento y abrí Búsqueda manual.",
      "Buscá por DNI, nombre, apellido o email y elegí a la persona correcta.",
      "Revisá identidad, estado y la evaluación de su clase e inscripción.",
      "Autorizá o rechazá manualmente e ingresá la observación obligatoria.",
    ],
    warnings: ["La autorización manual puede permitir el ingreso aunque la evaluación automática sea negativa; debe quedar justificada."],
    links: [{ label: "Búsqueda manual", href: "/access/manual", permission: permission("access", "ver") }],
  },
  {
    id: "admin-create-activity", category: "administration", order: 10,
    title: "Crear una actividad mediante el workflow", description: "Los diez pasos actuales, los datos previos, los borradores y la publicación.",
    requiredPermissions: [permission("actividades", "crear")],
    keywords: ["crear", "actividad", "workflow", "borrador", "publicar", "horario", "clase", "cupo", "profesor"],
    steps: [
      "Antes de empezar, verificá que exista la categoría y al menos un establecimiento activo. Si la modalidad requiere profesor, también debe existir un usuario de Personal con rol Profesor y un perfil profesional activo. Dirigido a, requisitos y recursos son catálogos opcionales según el caso.",
      "1. Modalidad: elegí Horario fijo, Turno recurrente, Turno puntual, Acceso libre, Evento único o Curso con período. La modalidad determina cómo se ocupa el cupo y cómo se inscribe la persona.",
      "2. Información: cargá nombre, descripciones, imagen, categoría, nivel y modalidad económica. La edad y el género no se cargan acá: se definen mediante Dirigido a.",
      "3. Establecimiento: seleccioná la sede donde se realizará. Si todavía no existe, guardá el borrador, creá el establecimiento y retomá luego.",
      "4. Horarios: marcá los días que comparten una franja y definí hora de inicio y finalización. En modalidades por turno, esta franja es la ventana general dentro de la que se ofrecerán los turnos.",
      "5. Cupos y recursos: indicá el cupo general cuando haya reserva y asociá recursos físicos activos de la sede sólo si la actividad los necesita.",
      "6. Profesores: buscá y seleccioná perfiles con rol Profesor. El sistema comprueba superposiciones antes de aceptar la asignación. Acceso libre y Turno puntual pueden quedar sin profesor; las demás modalidades lo requieren para publicarse.",
      "7. Dirigido a: seleccioná uno o más públicos para aplicar edad o género. Si no elegís ninguno, se interpreta como Todo público y el paso queda válido.",
      "8. Requisitos: seleccioná documentación, condiciones o elementos y definí si son obligatorios. Si no elegís ninguno, se interpreta como Sin requisitos y el paso queda válido.",
      "9. Reservas: configurá vigencia, duración e intervalo de turnos cuando corresponda, anticipación, límite por persona, cancelación justificada y el período inicial de clases. Acceso libre no genera clases reservables.",
      "10. Revisión: comprobá el resumen y los puntos pendientes. Cada pendiente informa el motivo y permite volver al paso que debe corregirse. Crear actividad o Guardar cambios sólo se habilita cuando no quedan pendientes obligatorios.",
      "Guardar borrador y salir conserva el progreso sin publicar. El borrador aparece en Actividades, desde donde podés continuarlo o descartarlo. Al editar una actividad existente también podés salir sin guardar para mantener intacta la versión publicada.",
      "Al publicar, el sistema crea o actualiza la actividad, sus horarios y las clases iniciales definidas. Después, Inscripciones, Clases y Asistencias se operan en sus secciones específicas.",
    ],
    warnings: ["No cargues horarios o clases iniciales por fuera del workflow: Horarios y Clases son pantallas operativas para consultar y aplicar cambios acotados después de publicar.", "Cambiar imagen, nombre o descripción no debe regenerar clases. Los cambios de días, franjas, modalidad o estado sí pueden afectar la programación futura.", "Una actividad sin clases concretas no aparece en la agenda ni permite controles asociados a una fecha."],
    links: [{ label: "Nueva actividad", href: "/activities/new", permission: permission("actividades", "crear") }, { label: "Actividades y borradores", href: "/activities", permission: permission("actividades", "ver") }],
  },
  {
    id: "admin-catalogs-facilities", category: "administration", order: 20,
    title: "Preparar catálogos y datos previos", description: "Qué debe existir antes del workflow y qué puede completarse más adelante.",
    requiredPermissions: [permission("actividades", "ver")],
    keywords: ["categoría", "dirigido a", "requisito", "establecimiento", "recurso", "profesor", "dependencia"],
    steps: ["Categorías clasifica la propuesta y debe existir antes de completar Información.", "Dirigido a concentra edad y género. Es opcional: sin selección, la actividad queda disponible para todo público.", "Requisitos define documentos, condiciones o elementos de ingreso. Es opcional: sin selección, la actividad queda sin requisitos.", "Establecimientos define sede, ubicación, contacto y horarios de apertura; debe estar activo para seleccionarlo.", "Recursos físicos representa computadoras, canchas, espacios u objetos con capacidad y forma de reserva. Sólo es obligatorio cuando la actividad necesita controlar un recurso.", "Profesores se crea a partir de una cuenta de Personal con rol Profesor o Administrador. Debe estar activo y sin superposición para ser asignado.", "Obras sociales y prepagas pertenece a los datos de ciudadanos y solicitudes de acceso; no condiciona la creación de actividades.", "Si falta una dependencia, guardá la actividad como borrador, creá el dato faltante desde su sección y retomá el workflow."],
    links: [{ label: "Categorías", href: "/activity-categories", permission: permission("categorias_actividades", "ver") }, { label: "Públicos objetivo", href: "/target-audiences", permission: permission("publicos_objetivo", "ver") }, { label: "Establecimientos", href: "/facilities", permission: permission("establecimientos", "ver") }, { label: "Requisitos", href: "/requirements", permission: permission("requirements", "ver") }],
  },
  {
    id: "admin-professors-schedules", category: "administration", order: 30,
    title: "Operar horarios y clases ya publicadas", description: "Para qué sirven estas pantallas después del workflow y qué cambios admiten.",
    requiredPermissions: [permission("profesores", "ver"), permission("activity_schedules", "ver")], permissionMode: "all",
    keywords: ["profesor", "horario", "clase", "suspender", "cancelar", "superposición"],
    steps: ["El workflow es el único punto de entrada para crear la actividad, sus horarios y sus clases iniciales.", "Horarios muestra la regla semanal publicada: días, franja, sede, cupo, recursos y profesores. Se usa para consulta y ajustes operativos acotados, no para crear una actividad paralela.", "Clases muestra cada ocurrencia concreta por fecha. No se crea ni se edita libremente desde allí.", "Suspendé una clase cuando no se dicta temporalmente: el motivo se guarda y se notifica a las personas inscriptas.", "Cancelá sólo cuando la clase queda anulada de forma definitiva. Finalizar representa que la clase se dictó y cerró su ciclo operativo.", "Los cambios estructurales de días, franjas o modalidad se realizan editando la actividad mediante el workflow; el sistema debe aplicarlos a la programación futura sin alterar el historial pasado."],
    warnings: ["Una modificación visual o descriptiva de la actividad no regenera horarios ni clases.", "El profesor no puede autoasignarse y no puede quedar superpuesto con otra actividad."],
    links: [{ label: "Profesores", href: "/teachers", permission: permission("profesores", "ver") }, { label: "Horarios", href: "/activity-schedules", permission: permission("activity_schedules", "ver") }],
  },
  {
    id: "admin-enrollments-attendance", category: "administration", order: 40,
    title: "Operar inscripciones, clases y asistencias", description: "Seguimiento diario después de publicar la actividad.",
    requiredPermissions: [permission("enrollments", "editar"), permission("activity_sessions", "editar"), permission("attendance", "editar")], permissionMode: "all",
    keywords: ["inscripción", "documentación", "clase", "asistencia", "lista de espera"],
    steps: ["Consultá inscripciones y sus estados por actividad u horario.", "Revisá documentación pendiente y aprobala o rechazala con observaciones.", "Supervisá clases programadas y cambiá su estado cuando corresponda.", "Tomá o corregí asistencia mientras la planilla esté abierta.", "Al cerrar, los alumnos sin registro quedan ausentes; la reapertura requiere permiso específico."],
    links: [{ label: "Inscripciones", href: "/enrollments", permission: permission("enrollments", "ver") }, { label: "Documentos ciudadanos", href: "/user-documents", permission: permission("enrollment_documents", "ver") }, { label: "Clases", href: "/activity-sessions", permission: permission("activity_sessions", "ver") }, { label: "Asistencias", href: "/attendance", permission: permission("attendance", "ver") }],
  },
  {
    id: "admin-citizen-workflow", category: "administration", order: 50,
    title: "Dar de alta o editar un ciudadano", description: "Workflow de siete pasos con rol Ciudadano fijo y revisión antes de guardar.",
    requiredPermissions: [permission("usuarios", "crear")],
    keywords: ["ciudadano", "usuario", "alta", "editar", "workflow", "credenciales", "imágenes"],
    steps: [
      "Entrá en Ciudadanos y elegí Nuevo ciudadano. El listado sólo contiene cuentas con rol Ciudadano; este rol queda asignado automáticamente y no se puede reemplazar desde el alta.",
      "1. Datos personales: completá nombre, apellido, DNI, fecha de nacimiento, nacionalidad y sexo o género. La edad se calcula a partir de la fecha de nacimiento.",
      "2. Credenciales: definí User ID y contraseña. El rol visible debe ser Ciudadano y el sistema valida que exista el rol base antes de continuar.",
      "3. Domicilio: cargá dirección, localidad, provincia y código postal. Si Google Maps está configurado se ofrecen sugerencias y validación; de lo contrario la carga continúa manualmente.",
      "4. Contacto: cargá email, celular, persona de referencia y teléfono de emergencia.",
      "5. Cobertura: seleccioná una obra social o prepaga activa y, cuando corresponda, indicá el número de afiliado. El selector muestra un estado de carga mientras consulta el catálogo.",
      "6. Imágenes: cargá por selección o arrastre el avatar del portal y la foto de identidad. El avatar se muestra en la interfaz; la foto de identidad se usa para la comprobación visual en ingresos.",
      "7. Revisión: comprobá toda la información. Llegar a esta pantalla no guarda automáticamente; debés presionar Guardar cambios.",
      "Guardar y continuar valida únicamente el paso actual y lo marca como correcto o incorrecto. Si existe un error, el workflow no avanza y muestra qué campo debe corregirse.",
      "Después de crear la cuenta, el sistema vuelve al listado de Ciudadanos. Al editar se usa el mismo workflow con los datos existentes precargados.",
    ],
    warnings: ["Ciudadanos no debe utilizarse para crear administradores, profesores ni recepcionistas; esas cuentas se cargan desde Personal.", "La foto de identidad y el avatar tienen finalidades distintas y no deben intercambiarse."],
    links: [{ label: "Ciudadanos", href: "/users", permission: permission("usuarios", "ver") }, { label: "Nuevo ciudadano", href: "/users/new", permission: permission("usuarios", "crear") }],
  },
  {
    id: "admin-personnel-workflow", category: "administration", order: 55,
    title: "Dar de alta o editar personal", description: "Workflow para administradores, profesores, recepción y demás personal asociado.",
    requiredPermissions: [permission("usuarios", "crear")],
    keywords: ["personal", "profesor", "administrador", "recepción", "alta", "editar", "workflow", "rol"],
    steps: [
      "Entrá en Personal y elegí Nuevo personal. Esta sección está separada de Ciudadanos y se utiliza para las cuentas que cumplen funciones internas.",
      "1. Datos personales: completá identidad, DNI, fecha de nacimiento, nacionalidad y sexo o género.",
      "2. Credenciales: definí User ID, contraseña y el rol de acceso correspondiente, por ejemplo Administrador, Profesor o Recepción. A diferencia del alta de ciudadano, acá el administrador sí selecciona el rol.",
      "3. Domicilio: registrá dirección, localidad, provincia y código postal.",
      "4. Contacto: cargá email, celular y datos de contacto de emergencia.",
      "5. Cobertura: asociá una obra social o prepaga y número de afiliado cuando corresponda.",
      "6. Imágenes: cargá el avatar de uso cotidiano y la foto de identidad mediante selección o arrastre.",
      "7. Revisión: verificá las secciones y presioná Guardar cambios. El formulario nunca debe enviarse automáticamente al entrar en Revisión.",
      "Cada Guardar y continuar valida el paso actual y muestra un check o una marca de error en el menú lateral. Los errores pendientes impiden el guardado final.",
      "Al crear la cuenta, el sistema vuelve a Personal. Si el rol es Profesor, después creá o vinculá su perfil profesional desde Profesores para completar especialidad, matrícula, descripción y asignaciones.",
      "La edición reutiliza los mismos siete pasos y debe precargar domicilio, cobertura e imágenes existentes antes de mostrar el formulario completo.",
    ],
    warnings: ["Asignar el rol Profesor no crea automáticamente el perfil profesional: ambas entidades deben quedar vinculadas.", "Un rol incorrecto cambia la experiencia y los permisos del usuario; revisalo antes de confirmar."],
    links: [{ label: "Personal", href: "/personnel", permission: permission("usuarios", "ver") }, { label: "Nuevo personal", href: "/personnel/new", permission: permission("usuarios", "crear") }, { label: "Profesores", href: "/teachers", permission: permission("profesores", "ver") }],
  },
  {
    id: "admin-access-requests-roles", category: "administration", order: 58,
    title: "Revisar solicitudes, roles y permisos", description: "Aprobación del acceso y configuración de las funciones habilitadas.",
    requiredPermissions: [permission("usuarios", "ver"), permission("roles", "ver")], permissionMode: "any",
    keywords: ["solicitud", "aprobar", "rechazar", "rol", "permiso", "acceso"],
    steps: ["Revisá las solicitudes pendientes y compará datos personales y foto de identidad antes de habilitar la cuenta.", "Al rechazar, informá un motivo claro: será notificado y visible para que la persona pueda corregir y reenviar.", "Consultá en la ficha el historial, quién revisó la solicitud y cuándo.", "En Roles y permisos, usá un código interno estable y un nombre visible en español.", "Agrupá y asigná permisos por módulo y acción según la función real del personal.", "Cuando cambien permisos efectivos, pedí al usuario que vuelva a iniciar sesión si la experiencia abierta todavía conserva información anterior."],
    links: [{ label: "Ciudadanos", href: "/users", permission: permission("usuarios", "ver") }, { label: "Roles y permisos", href: "/roles", permission: permission("roles", "ver") }],
  },
  {
    id: "admin-documents", category: "administration", order: 60,
    title: "Revisar documentos ciudadanos", description: "Carga administrativa, aprobación, rechazo y seguimiento de vigencia.",
    requiredPermissions: [permission("enrollment_documents", "ver")],
    keywords: ["documentos", "ciudadano", "aprobar", "rechazar", "vencimiento"],
    steps: ["Abrí Documentos desde Ciudadanos y buscá por tipo de documento.", "Seleccioná una presentación para comprobar el archivo y los datos del ciudadano.", "Aprobá si corresponde o rechazá indicando una causa clara; el ciudadano recibe una notificación.", "Si la persona presenta el archivo en Administración, usá la carga administrativa desde su ficha.", "Controlá la vigencia desde el requisito asociado; un vencimiento no elimina automáticamente una inscripción."],
    links: [{ label: "Documentos ciudadanos", href: "/user-documents", permission: permission("enrollment_documents", "ver") }],
  },
  {
    id: "admin-personnel-resources", category: "administration", order: 70,
    title: "Gestionar personal, sedes y recursos", description: "Datos necesarios para asignar responsables y capacidad operativa.",
    requiredPermissions: [permission("usuarios", "ver")],
    keywords: ["personal", "profesor", "establecimiento", "recurso", "obra social"],
    steps: ["Usá Personal para crear cuentas de administrador, recepción o profesor; Ciudadanos queda reservado al rol ciudadano.", "Creá el perfil profesional y asocialo a un usuario habilitado con rol de profesor o administrador.", "Configurá establecimientos, jornadas y datos de contacto antes de publicar actividades.", "Registrá recursos físicos y su forma de reserva para controlar capacidad y colisiones.", "Mantené el catálogo de obras sociales y prepagas disponible para altas y solicitudes de acceso."],
    links: [{ label: "Personal", href: "/personnel", permission: permission("usuarios", "ver") }, { label: "Profesores", href: "/teachers", permission: permission("profesores", "ver") }, { label: "Establecimientos", href: "/facilities", permission: permission("establecimientos", "ver") }, { label: "Recursos físicos", href: "/resources", permission: permission("resources", "ver") }, { label: "Obras sociales", href: "/medical-coverages", permission: permission("usuarios", "ver") }],
  },
  {
    id: "admin-notifications", category: "administration", order: 80,
    title: "Gestionar notificaciones", description: "Bandejas personales, avisos al rol administrador y comunicaciones emitidas.",
    keywords: ["notificaciones", "recibidas", "enviadas", "archivar", "leídas"],
    steps: ["Abrí Notificaciones para consultar primero las comunicaciones no leídas.", "Usá las bandejas Recibidas y Enviadas para separar lo destinado a tu usuario o rol de lo que emitiste.", "Marcá o archivá notificaciones individualmente o en conjunto; las acciones personales no alteran la lectura de otros administradores.", "Abrí una notificación para revisar su detalle y la acción asociada cuando corresponda."],
    links: [{ label: "Notificaciones", href: "/notifications" }],
  },
  {
    id: "admin-control-reports", category: "administration", order: 90,
    title: "Auditar y consultar reportes", description: "Trazabilidad de cambios e indicadores para control administrativo.",
    requiredPermissions: [permission("audit_log", "ver"), permission("reports", "ver")], permissionMode: "any",
    keywords: ["auditoría", "reportes", "registro", "indicadores", "control"],
    steps: ["Usá Auditoría para buscar operaciones por usuario, módulo, acción o período y abrir el detalle del registro.", "Usá Reportes para consultar los indicadores disponibles y aplicar sus filtros.", "Contrastá el registro de auditoría antes de corregir manualmente un estado o dato sensible."],
    links: [{ label: "Auditoría", href: "/audit-log", permission: permission("audit_log", "ver") }, { label: "Reportes", href: "/reports", permission: permission("reports", "ver") }],
  },
  {
    id: "admin-test-data", category: "administration", order: 100,
    title: "Reiniciar datos de prueba", description: "Limpieza controlada del entorno de desarrollo conservando el acceso administrador.",
    requiredPermissions: [permission("system", "reset_database")],
    keywords: ["datos", "prueba", "reiniciar", "limpiar", "base"],
    steps: ["Ingresá a Datos de prueba únicamente en un entorno de desarrollo.", "Revisá el alcance informado antes de confirmar.", "Ejecutá la limpieza para eliminar datos operativos y reconstruir los roles base y el usuario administrador."],
    warnings: ["Es una acción destructiva y no debe utilizarse sobre datos reales."],
    links: [{ label: "Datos de prueba", href: "/system/data-reset", permission: permission("system", "reset_database") }],
  },
];
