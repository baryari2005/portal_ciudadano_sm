import { Prisma } from "@prisma/client";
import { CatalogConflictError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { nextDraftTimestamp } from "@/features/activity-workflow/helpers/draft-persistence";
import { activityConfigurationSchema, configurationDates, publishedConfiguration, withConfiguration, type ActivityConfiguration } from "../helpers/activity-configuration";

type Db = Pick<Prisma.TransactionClient, "actividadBorrador" | "horarioActividad" | "$queryRaw">;
export async function readActivityConfiguration(db: Db, activityId: string) {
  const row=await db.actividadBorrador.findUnique({where:{actividadId:activityId},select:{payload:true,publicadoAt:true}});
  const configuration=publishedConfiguration(row);
  if(configuration||!row?.publicadoAt)return configuration;
  const schedules=await db.horarioActividad.findMany({where:{actividadId:activityId},select:{id:true,establecimientoId:true,diaSemana:true,horaInicio:true,horaFin:true,espacio:true}});
  return publishedConfiguration(row,schedules);
}
export async function activityConfigurations(db: Db, ids: string[]) {
  const rows = ids.length ? await db.actividadBorrador.findMany({where:{actividadId:{in:[...new Set(ids)]}},select:{actividadId:true,payload:true,publicadoAt:true}}) : [];
  const unresolved=rows.filter(row=>row.publicadoAt&&!publishedConfiguration(row));
  const schedules=unresolved.length?await db.horarioActividad.findMany({where:{actividadId:{in:unresolved.map(row=>row.actividadId!)}},select:{id:true,actividadId:true,establecimientoId:true,diaSemana:true,horaInicio:true,horaFin:true,espacio:true}}):[];
  return new Map(rows.map(row=>[row.actividadId!,publishedConfiguration(row,schedules.filter(schedule=>schedule.actividadId===row.actividadId))]));
}
export async function withActivityValidity<T extends {id:string}>(db: Db, activity: T) {
  return {...activity,...configurationDates(await readActivityConfiguration(db,activity.id))};
}
/** Call inside the same transaction and activity lock as the operational change. */
export async function writeActivityConfiguration(db: Db, activityId: string, patch: Partial<Omit<ActivityConfiguration,"version">>, actorId?: string) {
  const row = await db.actividadBorrador.findUnique({where:{actividadId:activityId}});
  const current = await readActivityConfiguration(db,activityId);
  const parsed = activityConfigurationSchema.safeParse({version:1,endDate:null,excludedDates:[],schedules:[],...current,...patch});
  if (!parsed.success) throw new CatalogValidationError("Confirmá la fecha inicial y la vigencia de la actividad antes de guardar su programación.");
  const creator = row?.creadoPorId ?? actorId;
  if (!creator) throw new CatalogValidationError("No pudimos identificar al responsable de la configuración.");
  const payload = withConfiguration(row?.payload,parsed.data) as unknown as Prisma.InputJsonValue;
  if (row) {
    // With relationMode=prisma, updateMany may select IDs before updating.
    // Keep this lock until the caller's transaction commits.
    await db.$queryRaw`SELECT id FROM "ActividadBorrador" WHERE id = ${row.id} FOR UPDATE`;
    const result = await db.actividadBorrador.updateMany({where:{id:row.id,updatedAt:row.updatedAt},data:{payload,updatedAt:nextDraftTimestamp(row.updatedAt)}});
    if (!result.count) throw new CatalogConflictError("La configuración cambió en otra sesión. Recargá la actividad antes de guardar para conservar los cambios más recientes.");
  }
  else await db.actividadBorrador.create({data:{actividadId:activityId,creadoPorId:creator,payload,estado:"PUBLICADO",publicadoAt:new Date()}});
  return parsed.data;
}
