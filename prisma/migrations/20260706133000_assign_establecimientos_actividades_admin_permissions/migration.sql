-- Assign the new CRUD permissions to the admin roles managed by the existing seed.
-- Runtime authorization still checks permissions, not role names.

INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT r."id", p."id"
FROM "Rol" r
CROSS JOIN "Permiso" p
WHERE r."nombre" IN ('ADMIN', 'admin')
  AND p."modulo" IN ('establecimientos', 'actividades')
  AND p."accion" IN ('ver', 'crear', 'editar', 'eliminar')
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
