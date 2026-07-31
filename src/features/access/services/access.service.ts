import { axiosInstance } from "@/lib/axios";
import type { AccessPerson, AccessValidationResponse } from "../types/access.types";
export type EstablishmentOption = { id: string; nombre: string };
export async function getAccessOptions() { return (await axiosInstance.get<{ data: EstablishmentOption[] }>("/access", { params: { view: "options" } })).data.data; }
export async function getAccessHome(establishmentId: string) { return (await axiosInstance.get("/access", { params: { view: "home", establishmentId } })).data.data; }
export async function validateAccessQr(establishmentId: string, qrToken: string) { return (await axiosInstance.post<AccessValidationResponse>("/access/qr/validate", { establishmentId, qrToken })).data; }
export async function searchAccessPeople(establishmentId: string, q: string, page = 1) { return (await axiosInstance.get("/access/manual/search", { params: { establishmentId, q, page, pageSize: 8 } })).data; }
export async function registerManualAccess(data: { establishmentId: string; userId: string; decision: "ALLOW" | "REJECT"; observation: string }) { return (await axiosInstance.post("/access/manual/register", data)).data.data as AccessValidationResponse; }
export async function listAccessHistory(params: Record<string, string | number | undefined>) { return (await axiosInstance.get("/access", { params })).data.data; }
export async function getAccessDetail(id: string) { return (await axiosInstance.get(`/access/${id}`)).data.data; }
export async function annulAccess(id: string, reason: string) { return (await axiosInstance.delete(`/access/${id}`, { data: { reason } })).data.data; }
export async function findAccessPersonByDni(dni: string) { return (await axiosInstance.get<AccessPerson | null>("/users/by-dni", { params: { dni } })).data; }
export async function searchLegacyAccessPeople(q: string) { return (await axiosInstance.get<{ data: AccessPerson[] }>("/users/search-access", { params: { q } })).data.data; }
