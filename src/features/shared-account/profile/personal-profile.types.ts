import type { Genero } from "@/constants/genero";
import type { Nacionalidad } from "@/constants/nacionalidad";

export type PersonalProfile={id:string;userId:string;nombre:string|null;apellido:string|null;documento:string|null;email:string;celular:string|null;domicilio:string|null;localidad:string|null;provincia:string|null;codigoPostal:string|null;fechaNacimiento:string|null;genero:Genero|null;nacionalidad:Nacionalidad|null;avatarUrl:string|null;fotoPerfilUrl:string|null;contactoEmergenciaNombre:string|null;contactoEmergenciaTelefono:string|null;numeroAfiliado:string|null;coberturaMedica?:{nombre:string;tipo:string}|null;domicilioPlaceId:string|null;domicilioLat:number|null;domicilioLng:number|null;coberturaMedicaId:string|null};
