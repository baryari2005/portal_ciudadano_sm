import { Prisma } from "@prisma/client";
import { toYmdUTC } from "./user.date";

export type UserWithRole = Prisma.UsuarioGetPayload<{
  include: { rol: true };
}>;

type UserDetailWithRelations = Prisma.UsuarioGetPayload<{
  include: { rol: true; coberturaMedica: true; profesor: true };
}>;

export function toUserListItem(u: UserWithRole) {
  return {
    id: u.id,
    userId: u.userId,
    email: u.email,
    nombre: u.nombre,
    apellido: u.apellido,
    avatarUrl: u.avatarUrl,
    estado: u.estado,
    perfilCompleto: u.perfilCompleto,
    rol: u.rol ? { id: u.rol.id, nombre: u.rol.nombre } : null,
    createdAt: u.createdAt,
    estadoParticipacion: u.estadoParticipacion,
    umbralAusenciasJustificadas: u.umbralAusenciasJustificadas,
    umbralAusenciasInjustificadas: u.umbralAusenciasInjustificadas,
    participacionObservaciones: u.participacionObservaciones,

    tipoDocumento: u.tipoDocumento,
    documento: u.documento,
    cuil: u.cuil,
    celular: u.celular,
    domicilio: u.domicilio,
    codigoPostal: u.codigoPostal,
    fechaNacimiento: u.fechaNacimiento,
    genero: u.genero,
    estadoCivil: u.estadoCivil,
    nacionalidad: u.nacionalidad,
  };
}

export function toUserDetail(user: UserDetailWithRelations) {
  return {
    id: user.id,
    userId: user.userId,
    email: user.email,
    rolId: user.rolId,
    estado: user.estado,
    perfilCompleto: user.perfilCompleto,
    rol: user.rol ? { id: user.rol.id, nombre: user.rol.nombre, codigo: user.rol.codigo } : null,

    nombre: user.nombre,
    apellido: user.apellido,
    avatarUrl: user.avatarUrl,
    fotoPerfilUrl: user.fotoPerfilUrl,
    celular: user.celular,
    domicilio: user.domicilio,
    localidad: user.localidad,
    provincia: user.provincia,
    domicilioPlaceId: user.domicilioPlaceId,
    domicilioLat: user.domicilioLat,
    domicilioLng: user.domicilioLng,
    codigoPostal: user.codigoPostal,
    contactoEmergenciaNombre: user.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: user.contactoEmergenciaTelefono,
    coberturaMedicaId: user.coberturaMedicaId,
    coberturaMedica: user.coberturaMedica
      ? { id: user.coberturaMedica.id, nombre: user.coberturaMedica.nombre }
      : null,
    numeroAfiliado: user.numeroAfiliado,

    tipoDocumento: user.tipoDocumento,
    documento: user.documento,
    cuil: user.cuil,

    fechaNacimiento: toYmdUTC(user.fechaNacimiento),
    genero: user.genero,
    estadoCivil: user.estadoCivil,
    nacionalidad: user.nacionalidad,
    estadoParticipacion: user.estadoParticipacion,
    umbralAusenciasJustificadas: user.umbralAusenciasJustificadas,
    umbralAusenciasInjustificadas: user.umbralAusenciasInjustificadas,
    participacionObservaciones: user.participacionObservaciones,
    profesor: user.profesor ? { especialidad: user.profesor.especialidad, matricula: user.profesor.matricula, descripcion: user.profesor.descripcion } : null,
    createdAt: user.createdAt,
  };
}
