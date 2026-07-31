const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);

  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const prisma = new PrismaClient();

const LEGACY_CATEGORY_SLUGS = {
  DEPORTE: "deportes",
  CULTURA: "cultura",
  EDUCACION: "educacion",
  SALUD: "salud",
};

async function main() {
  const activities = await prisma.actividad.findMany({
    where: { categoriaActividadId: null },
    select: { id: true, nombre: true, categoria: true },
    orderBy: { nombre: "asc" },
  });
  const categories = await prisma.categoriaActividad.findMany({
    where: { activo: true },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  const matched = [];
  const unmatched = [];

  for (const activity of activities) {
    const slug = LEGACY_CATEGORY_SLUGS[activity.categoria];
    const category = slug ? categoryBySlug.get(slug) : null;

    if (!category) {
      unmatched.push({
        id: activity.id,
        nombre: activity.nombre,
        categoriaHeredada: activity.categoria,
      });
      continue;
    }

    await prisma.actividad.update({
      where: { id: activity.id },
      data: { categoriaActividadId: category.id },
    });
    matched.push({
      id: activity.id,
      nombre: activity.nombre,
      categoriaHeredada: activity.categoria,
      slug,
    });
  }

  console.log(
    JSON.stringify(
      {
        revisadas: activities.length,
        relacionadas: matched.length,
        sinEquivalencia: unmatched.length,
        matched,
        unmatched,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
