export type HelpPermission = {
  modulo: string;
  accion: string;
};

export type HelpGuide = {
  id: string;
  category: "solicitudes" | "documentos" | "gestion";
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  permission?: HelpPermission | HelpPermission[];
  steps: string[];
};

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: "load-vacation-request",
    category: "solicitudes",
    title: "Como cargar una solicitud de vacaciones",
    description: "Guia rapida para pedir vacaciones desde el panel y dejar la solicitud lista.",
    href: "/vacations",
    ctaLabel: "Ir a Vacaciones",
    permission: { modulo: "vacaciones", accion: "cargar" },
    steps: [
      "Entra en la seccion Vacaciones desde el menu lateral.",
      "En el panel izquierdo elige la fecha de inicio y la cantidad de dias que quieres solicitar.",
      "Revisa el resumen de dias para confirmar que el periodo sea correcto.",
      "Agrega observaciones si hace falta y envia la solicitud.",
      "Despues de crearla, vas a verla en el historial con su estado actualizado.",
    ],
  },
  {
    id: "load-license-request",
    category: "solicitudes",
    title: "Como cargar una solicitud de licencia",
    description: "Paso a paso para cargar licencias con observaciones y adjuntos cuando haga falta.",
    href: "/licenses",
    ctaLabel: "Ir a Licencias",
    permission: { modulo: "licencias", accion: "cargar" },
    steps: [
      "Abre la seccion Licencias y elige el tipo de licencia que corresponde.",
      "Indica el rango de fechas para la solicitud.",
      "Completa el paso de observaciones si quieres dejar contexto para quien aprueba.",
      "En el paso siguiente adjunta certificados en PDF, JPG o PNG si aplica.",
      "Confirma la solicitud y revisa luego su estado en el historial.",
    ],
  },
  {
    id: "review-request-history",
    category: "solicitudes",
    title: "Como revisar solicitudes y vacaciones cargadas",
    description:
      "Te muestra donde ver el historial y como identificar si una solicitud sigue pendiente o ya fue resuelta.",
    href: "/vacations",
    ctaLabel: "Ver historial",
    permission: [
      { modulo: "vacaciones", accion: "cargar" },
      { modulo: "licencias", accion: "cargar" },
    ],
    steps: [
      "En Vacaciones o Licencias mira el panel derecho de historial.",
      "Ubica tu solicitud en la lista y revisa el tipo, fechas y estado actual.",
      "Si la solicitud tiene adjuntos, puedes abrirlos desde las acciones disponibles.",
      "Usa el historial para confirmar si quedo pendiente, aprobada, rechazada o cancelada.",
    ],
  },
  {
    id: "view-documents",
    category: "documentos",
    title: "Como ver y firmar mis documentos",
    description: "Te muestra como abrir recibos, revisarlos y firmarlos desde el visor.",
    href: "/receipts",
    ctaLabel: "Ir a Mis Documentos",
    permission: { modulo: "recibos", accion: "ver" },
    steps: [
      "Entra en Mis Documentos y elige un recibo de la lista.",
      "Usa el visor para revisar el PDF completo.",
      "Si el documento esta pendiente, puedes firmarlo o firmarlo no conforme.",
      "Los documentos firmados quedan disponibles en la pestana correspondiente.",
    ],
  },
  {
    id: "track-receipts",
    category: "documentos",
    title: "Como hacer seguimiento de recibos digitales",
    description: "Ideal para administracion o RRHH cuando necesitas revisar el estado de firma.",
    href: "/payroll/receipts",
    ctaLabel: "Ir a Seguimiento",
    permission: { modulo: "recibos", accion: "seguimiento" },
    steps: [
      "Entra en Seguimiento de Recibos Digitales.",
      "Usa los filtros por persona, estado o periodo para encontrar documentos.",
      "Expande el grupo del empleado que quieres revisar.",
      "Abre el PDF desde el visor para ver el documento sin salir de la pantalla.",
    ],
  },
  {
    id: "upload-payroll-pdfs",
    category: "documentos",
    title: "Como subir PDF de recibos",
    description: "Guia para cargar recibos en PDF desde la pantalla administrativa.",
    href: "/admin/docs",
    ctaLabel: "Ir a Subir recibos",
    permission: { modulo: "recibos", accion: "subir" },
    steps: [
      "Entra en la pantalla de administracion para subir recibos.",
      "Selecciona o arrastra los archivos PDF que quieres cargar al sistema.",
      "Revisa que los documentos correspondan al periodo y a las personas correctas.",
      "Confirma la carga y espera a que termine el procesamiento.",
      "Luego valida el resultado desde el seguimiento de recibos digitales.",
    ],
  },
  {
    id: "manage-leave-types",
    category: "gestion",
    title: "Como administrar tipos de licencia",
    description: "Para crear, editar o desactivar tipos que despues aparecen en las solicitudes.",
    href: "/leave-types",
    ctaLabel: "Ir a Tipos de licencia",
    permission: { modulo: "tipo_licencia", accion: "ver" },
    steps: [
      "Entra en Tipos de licencia desde el menu lateral.",
      "Crea un tipo nuevo indicando codigo, etiqueta y color.",
      "Edita un tipo existente si necesitas corregir datos o cambiar su estado.",
      "Desactiva los tipos que no deban seguir disponibles para nuevas solicitudes.",
    ],
  },
  {
    id: "load-vacation-balance",
    category: "gestion",
    title: "Como cargar el balance de vacaciones",
    description: "Explica como asignar dias, crear registros individuales o hacer cargas masivas.",
    href: "/vacation-balance",
    ctaLabel: "Ir a Balance de vacaciones",
    permission: { modulo: "vacaciones", accion: "asignar" },
    steps: [
      "Entra en Balance de vacaciones desde el menu administrativo.",
      "Usa la accion de crear para cargar un saldo individual a una persona.",
      "Si necesitas inicializar muchos registros, abre la opcion de carga masiva.",
      "Revisa el anio, los dias asignados y los datos del usuario antes de guardar.",
      "Despues de guardar, verifica que el balance quede visible en la tabla.",
    ],
  },
  {
    id: "manage-roles-and-permissions",
    category: "gestion",
    title: "Como modificar roles y permisos",
    description: "Te orienta para crear roles, editar permisos y ajustar accesos del sistema.",
    href: "/roles",
    ctaLabel: "Ir a Roles",
    permission: [
      { modulo: "roles", accion: "ver" },
      { modulo: "roles", accion: "editar" },
      { modulo: "roles", accion: "crear" },
    ],
    steps: [
      "Entra en la pantalla de Roles para ver el listado disponible.",
      "Usa la opcion de crear si necesitas un rol nuevo o abre uno existente para editarlo.",
      "Ajusta nombre, descripcion, estado y los permisos que debe tener ese rol.",
      "Guarda los cambios y revisa que el rol quede actualizado en el listado.",
      "Si hace falta, luego asigna ese rol a usuarios desde la administracion de usuarios.",
    ],
  },
  {
    id: "manage-users",
    category: "gestion",
    title: "Como administrar usuarios",
    description: "Alta, edicion y revision general de usuarios del sistema.",
    href: "/users",
    ctaLabel: "Ir a Usuarios",
    permission: { modulo: "usuarios", accion: "ver" },
    steps: [
      "Ingresa en Administrar para ver el listado completo.",
      "Busca un usuario por nombre, correo o criterio disponible.",
      "Abre el detalle para editar datos personales, rol o informacion laboral.",
      "Usa importacion o exportacion si necesitas trabajar con muchos usuarios.",
    ],
  },
  {
    id: "import-users",
    category: "gestion",
    title: "Como importar usuarios",
    description: "Guia para cargar usuarios en lote desde la pantalla de importacion.",
    href: "/users/import",
    ctaLabel: "Ir a Importar usuarios",
    permission: { modulo: "usuarios", accion: "importar" },
    steps: [
      "Entra en la pantalla Importar usuarios.",
      "Elige el origen o archivo que vas a usar para la importacion.",
      "Carga el archivo y revisa la vista previa antes de confirmar.",
      "Corrige errores detectados si el sistema marca filas invalidas.",
      "Ejecuta la importacion y luego verifica el resultado final.",
    ],
  },
  {
    id: "export-users",
    category: "gestion",
    title: "Como exportar usuarios",
    description: "Paso a paso para descargar el listado de usuarios desde la vista de exportacion.",
    href: "/users/export",
    ctaLabel: "Ir a Exportar usuarios",
    permission: { modulo: "usuarios", accion: "exportar" },
    steps: [
      "Entra en la pantalla Exportar usuarios.",
      "Revisa el resumen y la informacion disponible antes de generar el archivo.",
      "Ejecuta la accion de exportar para descargar el listado.",
      "Guarda el archivo generado y valida que incluya los datos esperados.",
    ],
  },
  {
    id: "approve-reject-vacations",
    category: "gestion",
    title: "Como aprobar o rechazar vacaciones",
    description: "Guia para revisar solicitudes pendientes de vacaciones y resolverlas desde administracion.",
    href: "/admin/vacations",
    ctaLabel: "Ir a Aprobar vacaciones",
    permission: [
      { modulo: "vacaciones", accion: "ver" },
      { modulo: "vacaciones", accion: "aprobar" },
      { modulo: "vacaciones", accion: "rechazar" },
    ],
    steps: [
      "Entra en Vacaciones pendientes de aprobacion.",
      "Revisa cada solicitud, sus fechas y los datos de la persona solicitante.",
      "Abre el detalle o los adjuntos si necesitas validar informacion adicional.",
      "Usa la accion de aprobar o rechazar segun corresponda.",
      "Confirma el resultado y verifica que el estado cambie en la lista.",
    ],
  },
  {
    id: "approve-reject-licenses",
    category: "gestion",
    title: "Como aprobar o rechazar licencias",
    description: "Explica como gestionar licencias pendientes y revisar sus adjuntos antes de decidir.",
    href: "/admin/licenses",
    ctaLabel: "Ir a Aprobar licencias",
    permission: [
      { modulo: "licencias", accion: "ver" },
      { modulo: "licencias", accion: "aprobar" },
      { modulo: "licencias", accion: "rechazar" },
    ],
    steps: [
      "Entra en Licencias pendientes de aprobacion.",
      "Revisa el tipo de licencia, el rango de fechas y las observaciones cargadas.",
      "Si la solicitud tiene certificados, abre los adjuntos antes de tomar una decision.",
      "Usa la accion de aprobar o rechazar segun la validacion realizada.",
      "Comprueba que la solicitud quede actualizada con su nuevo estado.",
    ],
  },
];
