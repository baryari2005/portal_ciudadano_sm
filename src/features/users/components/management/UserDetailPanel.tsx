"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  IdCard,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  X,
  AlertTriangle,
  Save,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel } from "@/components/shared/admin-patterns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { axiosInstance } from "@/lib/axios";
import { EnrollmentSummary } from "@/features/enrollments/components/EnrollmentSummary";
import { UserAttendanceHistory } from "@/features/attendance/components/UserAttendanceHistory";
import { UserQrCredentialCard } from "@/features/attendance-qr/components/UserQrCredentialCard";

import type {
  ManagedUser,
  ManagedUserStatus,
} from "../../types/management.types";
import { RolePill, StatusPill } from "./StatusPill";
import { UserAccessCardDialog } from "./UserAccessCardDialog";
import { UserAvatarMark } from "./UserAvatarMark";

type UserDetailPanelProps = {
  user: ManagedUser | null;
  loading?: boolean;
  onBack: () => void;
  onUserChanged?: () => void;
  compact?: boolean;
  showFullRecordAction?: boolean;
  context?: "admin" | "reception";
  scope?: "citizen" | "personnel";
};

async function updateUserStatus(
  userId: string,
  status: ManagedUserStatus,
  rejectionReason?: string,
) {
  if (status === "ACTIVO" || status === "RECHAZADO") {
    await axiosInstance.patch(`/users/${userId}/access-request`, {
      decision: status === "ACTIVO" ? "APPROVE" : "REJECT",
      ...(status === "RECHAZADO" ? { rejectionReason } : {}),
    });
    return;
  }
  await axiosInstance.patch(`/users/${userId}`, { estado: status });
}

export function UserDetailPanel({
  user,
  loading,
  onBack,
  onUserChanged,
  compact = false,
  showFullRecordAction = compact,
  context = "admin",
  scope = "citizen",
}: UserDetailPanelProps) {
  const [actionLoading, setActionLoading] = useState<ManagedUserStatus | null>(
    null,
  );
  const [cardUser, setCardUser] = useState<ManagedUser | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] =
    useState<ManagedUserStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [participationStatus, setParticipationStatus] = useState<ManagedUser["participationStatus"]>("HABILITADO");
  const [justifiedThreshold, setJustifiedThreshold] = useState("");
  const [unjustifiedThreshold, setUnjustifiedThreshold] = useState("");
  const [participationNotes, setParticipationNotes] = useState("");
  const [savingParticipation, setSavingParticipation] = useState(false);
  const [accessRequests, setAccessRequests] = useState<
    Array<{
      id: string;
      estado: string;
      motivoRechazo: string | null;
      enviadaAt: string;
      revisadaAt: string | null;
      revisadaPor: { nombre: string | null; apellido: string | null } | null;
    }>
  >([]);

  useEffect(() => {
    if (!user?.id) return;
    axiosInstance
      .get(`/users/${user.id}/access-request`)
      .then((response) => setAccessRequests(response.data.data ?? []))
      .catch(() => setAccessRequests([]));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    setParticipationStatus(user.participationStatus ?? "HABILITADO");
    setJustifiedThreshold(user.justifiedAbsenceThreshold?.toString() ?? "");
    setUnjustifiedThreshold(user.unjustifiedAbsenceThreshold?.toString() ?? "");
    setParticipationNotes(user.participationObservations ?? "");
  }, [user]);

  if (loading) {
    return <AdminDetailPanel loading loadingLabel="información del usuario" />;
  }

  if (!user) {
    return <AdminDetailPanel empty="Seleccioná un usuario para consultar su detalle." />;
  }

  const active = user.status === "ACTIVO";
  const canReviewRequest = user.status === "PENDIENTE";
  const approvedUser = { ...user, status: "ACTIVO" as const };
  const detailRows = [
    { icon: UserRound, label: "Usuario", value: user.userId },
    { icon: Mail, label: "Email", value: user.email },
    { icon: IdCard, label: "DNI", value: user.dni },
    { icon: Phone, label: "Telefono", value: user.phone },
    { icon: MapPin, label: "Direccion", value: user.address },
    {
      icon: CalendarDays,
      label: "Fecha de registro",
      value: user.registeredAt,
    },
    { icon: Clock, label: "Ultimo acceso", value: user.lastAccess },
    ...(context === "admin" ? [{ icon: ShieldCheck, label: "Rol asignado", value: user.role }] : []),
  ];

  async function handleStatusChange(nextStatus: ManagedUserStatus) {
    if (!user || actionLoading) {
      return;
    }

    setActionLoading(nextStatus);

    try {
      await updateUserStatus(user.id, nextStatus, rejectionReason);
      toast.success("Estado del usuario actualizado.");
      setConfirmStatus(null);
      setRejectionReason("");
      onUserChanged?.();

      if (nextStatus === "ACTIVO") {
        setCardUser(approvedUser);
        setCardOpen(true);
      }
    } catch {
      toast.error("No pudimos actualizar el estado del usuario.");
    } finally {
      setActionLoading(null);
    }
  }

  async function saveParticipationPolicy() {
    setSavingParticipation(true);
    try {
      await axiosInstance.patch(`/users/${user!.id}/participation`, { status: participationStatus, justifiedAbsenceThreshold: justifiedThreshold ? Number(justifiedThreshold) : null, unjustifiedAbsenceThreshold: unjustifiedThreshold ? Number(unjustifiedThreshold) : null, observations: participationNotes.trim() || null });
      toast.success("Política de participación actualizada.");
      onUserChanged?.();
    } catch { toast.error("No pudimos actualizar la política de participación."); }
    finally { setSavingParticipation(false); }
  }

  return (
    <>
      <AdminDetailPanel
        onBack={onBack}
        className={compact ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden" : undefined}
      >
        <AdminDetailHeader title={user.fullName} leading={<UserAvatarMark user={user} size="lg" />} badge={<div className="flex flex-wrap gap-2"><StatusPill status={user.status} />{context === "admin" ? <RolePill role={user.role} /> : null}</div>} action={showFullRecordAction && context === "admin" ? <Button asChild variant="outline" className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]"><Link href={`/users/${user.id}/record/overview${scope === "personnel" ? "?source=personnel" : ""}`}><Eye />Ver ficha completa</Link></Button> : null} />

        <div className={compact ? "brand-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2" : undefined}>
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <dl className="grid gap-3">
            {detailRows.map((row) => {
              return (
                <CatalogDetailField
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                >
                  {row.value}
                </CatalogDetailField>
              );
            })}
          </dl>

          {active ? <UserQrCredentialCard userId={user.id} /> : null}
        </div>

        {!compact ? <>{accessRequests.length ? (
          <section className="mt-6 rounded-[18px] border border-[var(--brand-border-soft)] bg-white/70 p-5">
            <h4 className="font-extrabold text-[var(--brand-heading)]">Historial de solicitudes de acceso</h4>
            <div className="mt-3 space-y-3">
              {accessRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-[var(--brand-border-soft)] p-3 text-sm">
                  <p className="font-bold">{request.estado}</p>
                  <p>Enviada: {new Date(request.enviadaAt).toLocaleString("es-AR")}</p>
                  {request.revisadaAt ? <p>Revisada: {new Date(request.revisadaAt).toLocaleString("es-AR")}</p> : null}
                  {request.revisadaPor ? <p>Por: {[request.revisadaPor.nombre, request.revisadaPor.apellido].filter(Boolean).join(" ")}</p> : null}
                  {request.motivoRechazo ? <p className="mt-2 text-red-700"><strong>Motivo:</strong> {request.motivoRechazo}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <EnrollmentSummary userId={user.id} compact />
        <UserAttendanceHistory userId={user.id} />
        <section className="mt-6 rounded-[18px] border border-[var(--brand-border-soft)] bg-white/70 p-5">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 text-[var(--brand-secondary)]" /><div><h4 className="font-extrabold text-[var(--brand-heading)]">Control de ausencias</h4><p className="mt-1 text-sm text-[var(--brand-text)]">Los valores vacíos utilizan los umbrales generales: 10 justificadas y 3 injustificadas.</p></div></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Ausencias justificadas</Label><Input type="number" min={1} max={100} value={justifiedThreshold} onChange={(event) => setJustifiedThreshold(event.target.value)} placeholder="General: 10" /></div>
            <div className="space-y-2"><Label>Ausencias injustificadas</Label><Input type="number" min={1} max={100} value={unjustifiedThreshold} onChange={(event) => setUnjustifiedThreshold(event.target.value)} placeholder="General: 3" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Estado de participación</Label><Select value={participationStatus} onValueChange={(value) => setParticipationStatus(value as ManagedUser["participationStatus"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HABILITADO">Habilitado</SelectItem><SelectItem value="EN_REVISION">En revisión</SelectItem><SelectItem value="SUSPENDIDO_PROVISORIO">Suspendido provisoriamente</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Observaciones administrativas</Label><Textarea value={participationNotes} onChange={(event) => setParticipationNotes(event.target.value)} /></div>
          </div>
          <Button disabled={savingParticipation} className="mt-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" onClick={() => void saveParticipationPolicy()}>{savingParticipation ? <Clock className="animate-spin" /> : <Save />}Guardar política</Button>
        </section>
        </> : null}
        </div>

        <AdminDetailActions className={compact ? "lg:shrink-0" : undefined}>
          <Button asChild className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
            <Link href={context === "reception" ? `/reception/citizens/${user.id}` : `/users/${user.id}${scope === "personnel" ? "?source=personnel" : ""}`}>
              <Edit3 /> {context === "reception" ? "Editar perfil" : "Editar"}
            </Link>
          </Button>
          {context === "admin" && canReviewRequest ? (
            <Button
              variant="outline"
              className="text-[var(--brand-primary)]"
              disabled={Boolean(actionLoading)}
              onClick={() => setConfirmStatus("ACTIVO")}
            >
              <CheckCircle2 /> Aprobar
            </Button>
          ) : null}
          {context === "admin" && canReviewRequest ? (
            <Button
              variant="outline"
              className="text-red-700 hover:bg-red-50"
              disabled={Boolean(actionLoading)}
              onClick={() => setConfirmStatus("RECHAZADO")}
            >
              <X /> Rechazar
            </Button>
          ) : null}
          {context === "admin" && user.status !== "BLOQUEADO" ? (
            <Button
              variant="outline"
              className="text-red-700 hover:bg-red-50"
              disabled={Boolean(actionLoading)}
              onClick={() => setConfirmStatus("BLOQUEADO")}
            >
              <LockKeyhole /> Bloquear
            </Button>
          ) : null}
        </AdminDetailActions>
      </AdminDetailPanel>
      <ConfirmDialog
        open={confirmStatus !== null}
        title={
          confirmStatus === "ACTIVO"
            ? "Aprobar usuario"
            : confirmStatus === "RECHAZADO"
              ? "Rechazar usuario"
              : "Bloquear usuario"
        }
        description={
          confirmStatus === "ACTIVO"
            ? "El usuario quedará aprobado y podrá acceder según los permisos de su rol."
            : confirmStatus === "RECHAZADO"
              ? "El usuario quedará rechazado y no podrá acceder al sistema. Podrás aprobarlo más adelante."
              : "El usuario quedará bloqueado y no podrá acceder al sistema hasta que vuelva a ser aprobado."
        }
        confirmLabel={
          confirmStatus === "ACTIVO"
            ? "Aprobar"
            : confirmStatus === "RECHAZADO"
              ? "Rechazar"
              : "Bloquear"
        }
        icon={
          confirmStatus === "ACTIVO" ? (
            <CheckCircle2 />
          ) : confirmStatus === "RECHAZADO" ? (
            <X />
          ) : (
            <LockKeyhole />
          )
        }
        loading={Boolean(actionLoading)}
        confirmDisabled={
          confirmStatus === "RECHAZADO" && rejectionReason.trim().length < 10
        }
        onClose={() => {
          if (!actionLoading) {
            setConfirmStatus(null);
            setRejectionReason("");
          }
        }}
        onConfirm={() => {
          if (confirmStatus) return handleStatusChange(confirmStatus);
        }}
      >
        {confirmStatus === "RECHAZADO" ? (
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={500}
              placeholder="Indicá qué debe corregir la persona para volver a enviar la solicitud."
              className="min-h-28"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres. {rejectionReason.length}/500
            </p>
          </div>
        ) : null}
      </ConfirmDialog>
      <UserAccessCardDialog
        user={cardUser}
        open={cardOpen}
        onOpenChange={setCardOpen}
      />
    </>
  );
}
