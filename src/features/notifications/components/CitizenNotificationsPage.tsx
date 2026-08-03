"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Flag,
  Inbox,
  Loader2,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminDetailActions,
  AdminDetailHeader,
  AdminDetailPanel,
  AdminListCard,
  AdminListPane,
  AdminPageShell,
  AdminSplitLayout,
  adminSecondaryButtonClass,
} from "@/components/shared/admin-patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CATALOG_PAGE_SIZE,
  CatalogDetailField,
  CatalogEmptyState,
  CatalogErrorState,
  CatalogFilterPopover,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
  formatCatalogDate,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { useCitizenNotifications } from "../hooks/useNotifications";
import {
  archiveAllAdminNotificationsClient,
  archiveAllCitizenNotificationsClient,
  markAllAdminNotificationsReadClient,
  markAllCitizenNotificationsReadClient,
  updateAdminNotificationClient,
  updateCitizenNotificationClient,
} from "../services/notifications.service";
import type { Notification, NotificationStatus } from "../types/notification.types";

type Scope = "citizen" | "admin" | "teacher";
type PersonalWorkspace = "citizen" | "reception";
type StatusFilter = "all" | "unread" | "read" | "archived";
type NotificationAction = "markAsRead" | "markAsUnread" | "archive";

const statuses: Record<NotificationStatus, string> = {
  NO_LEIDA: "Sin leer",
  LEIDA: "Leída",
  ARCHIVADA: "Archivada",
  ENVIADA: "Enviada",
};
const priorities = { BAJA: "Baja", NORMAL: "Normal", ALTA: "Importante" };
const NOTIFICATION_FETCH_LIMIT = 100;

const statusBadgeClass = (status: NotificationStatus) =>
  cn(
    "rounded-full border px-2.5 py-0.5 text-xs font-bold",
    status === "NO_LEIDA"
      ? "border-[#819B56]/40 bg-[#DDEF8F] text-[#1D4F36] hover:bg-[#DDEF8F]"
      : status === "ARCHIVADA"
        ? "border-[#B2B2B2] bg-[#B2B2B2]/15 text-[#555] hover:bg-[#B2B2B2]/15"
        : "border-[#C9D9C3] bg-white text-[#315644] hover:bg-white",
  );

function accessRequestStatus(item: Notification) {
  if (item.type === "SOLICITUD_ACCESO_APROBADA") return "APROBADA";
  if (item.type === "SOLICITUD_ACCESO_RECHAZADA") return "RECHAZADA";
  if (item.type === "SOLICITUD_ACCESO_CREADA") return "PENDIENTE";
  return null;
}

function notificationAction(item: Notification, scope: Scope, workspace: PersonalWorkspace) {
  const requestStatus = accessRequestStatus(item);
  if (requestStatus === "APROBADA" || requestStatus === "PENDIENTE") return null;
  if (requestStatus === "RECHAZADA") {
    return { href: "/request-access", label: "Corregir y reenviar" };
  }
  if (workspace === "reception" && item.actionUrl?.startsWith("/citizen")) {
    const receptionRoutes: Record<string, string> = {
      "/citizen/profile": "/reception/profile",
      "/citizen/qr": "/reception/qr",
      "/citizen/notifications": "/reception/notifications",
    };
    const href = receptionRoutes[item.actionUrl];
    return href ? { href, label: item.actionLabel || "Ver detalle" } : null;
  }
  if (workspace === "reception" && item.actionUrl && !item.actionUrl.startsWith("/reception") && item.actionUrl !== "/request-access") return null;
  if (scope !== "citizen" && item.actionUrl?.startsWith("/citizen")) return null;
  return item.actionUrl
    ? { href: item.actionUrl, label: item.actionLabel || "Ver detalle" }
    : null;
}

export function CitizenNotificationsPage({
  title = "Mis notificaciones",
  scope = "citizen",
  workspace = "citizen",
}: {
  title?: string;
  scope?: Scope;
  workspace?: PersonalWorkspace;
} = {}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Notification | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unread");
  const [mailbox, setMailbox] = useState<"received" | "sent">("received");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const requestFilters = useMemo(
    () => ({
      pageSize: NOTIFICATION_FETCH_LIMIT,
      ...(statusFilter === "archived"
        ? { status: "ARCHIVADA" }
        : statusFilter === "unread"
          ? { status: "NO_LEIDA" }
          : statusFilter === "read"
            ? { status: "LEIDA" }
            : { includeArchived: true }),
    }),
    [statusFilter],
  );
  const { items, meta, loading, hasLoaded, error, refresh } = useCitizenNotifications(
    requestFilters,
    scope === "admin" ? "admin" : "citizen",
    mailbox,
  );
  const unread = meta.unreadCount ?? items.filter((item) => item.status === "NO_LEIDA").length;
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? items.filter((item) =>
          `${item.title} ${item.message} ${item.user?.firstName ?? ""} ${item.user?.lastName ?? ""}`
            .toLowerCase()
            .includes(value),
        )
      : items;
  }, [items, query]);
  const shown = filtered.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  useEffect(() => { setPage(1); setSelected(null); }, [query, statusFilter, mailbox]);

  if (loading && !hasLoaded) return <CatalogLoadingState label="notificaciones" fullPage />;

  async function runAction(key: string, work: () => Promise<void>) {
    setActionLoading(key);
    try {
      await work();
    } catch {
      toast.error("No pudimos actualizar las notificaciones.");
    } finally {
      setActionLoading(null);
    }
  }

  async function markAllRead() {
    await runAction("read-all", async () => {
      if (scope === "admin") await markAllAdminNotificationsReadClient();
      else await markAllCitizenNotificationsReadClient();
      if (selected?.status === "NO_LEIDA") {
        setSelected({ ...selected, status: "LEIDA", readAt: new Date().toISOString() });
      }
      await refresh();
    });
  }

  async function archiveAll() {
    await runAction("archive-all", async () => {
      if (scope === "admin") await archiveAllAdminNotificationsClient();
      else await archiveAllCitizenNotificationsClient();
      setSelected(null);
      await refresh();
    });
  }

  async function updateSelected(action: NotificationAction) {
    if (!selected) return;
    await runAction(`${action}:${selected.id}`, async () => {
      if (scope === "admin") await updateAdminNotificationClient(selected.id, action);
      else await updateCitizenNotificationClient(selected.id, action);
      const nextStatus: NotificationStatus =
        action === "archive" ? "ARCHIVADA" : action === "markAsUnread" ? "NO_LEIDA" : "LEIDA";
      setSelected({ ...selected, status: nextStatus });
      await refresh(false);
    });
  }

  async function selectNotification(item: Notification) {
    setSelected(item);
  }

  return (
    <AdminPageShell>
      <CatalogPageHeader
        icon={Bell}
        title={title}
        description={`${meta.total ?? items.length} comunicaciones recibidas · ${unread} sin leer`}
        total={filtered.length}
        actions={mailbox === "received" ?
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className={adminSecondaryButtonClass}
              disabled={!unread || Boolean(actionLoading)}
              onClick={() => void markAllRead()}
            >
              {actionLoading === "read-all" ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              Marcar todas como leídas
            </Button>
            <Button
              variant="outline"
              className={adminSecondaryButtonClass}
              disabled={!items.some((item) => item.status !== "ARCHIVADA") || Boolean(actionLoading)}
              onClick={() => void archiveAll()}
            >
              {actionLoading === "archive-all" ? <Loader2 className="animate-spin" /> : <Archive />}
              Archivar todas
            </Button>
          </div> : undefined
        }
      />

      <AdminSplitLayout
        list={
          <AdminListPane detailOpen={Boolean(selected)}>
            <Tabs value={mailbox} onValueChange={(value) => setMailbox(value as "received" | "sent")}>
              <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl border border-[var(--brand-border)] bg-white p-1 shadow-sm">
                <TabsTrigger value="received" className={cn("h-10 gap-2 rounded-lg bg-transparent font-bold text-[var(--brand-muted)] shadow-none hover:bg-[var(--brand-panel)]", mailbox === "received" && "!bg-[var(--brand-primary)] !text-white shadow-sm hover:!bg-[var(--brand-primary-hover)]")}>
                  <Inbox className="size-4" />
                  Recibidas
                </TabsTrigger>
                <TabsTrigger value="sent" className={cn("h-10 gap-2 rounded-lg bg-transparent font-bold text-[var(--brand-muted)] shadow-none hover:bg-[var(--brand-panel)]", mailbox === "sent" && "!bg-[var(--brand-primary)] !text-white shadow-sm hover:!bg-[var(--brand-primary-hover)]")}>
                  <Send className="size-4" />
                  Enviadas
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <CatalogSearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por título o mensaje..."
              />
              {mailbox === "received" ? <CatalogFilterPopover
                sections={[
                  {
                    id: "notification-status",
                    title: "Estado",
                    value: statusFilter,
                    options: [
                      { value: "all", label: "Todas" },
                      { value: "unread", label: "Sin leer" },
                      { value: "read", label: "Leídas" },
                      { value: "archived", label: "Archivadas" },
                    ],
                    onChange: (value) => setStatusFilter(value as StatusFilter),
                  },
                ]}
              /> : null}
            </div>

            {loading ? (
              <CatalogLoadingState label="notificaciones" />
            ) : error ? (
              <CatalogErrorState message={error} onRetry={() => void refresh()} />
            ) : !filtered.length ? (
              <CatalogEmptyState
                title={query.trim() || statusFilter !== "all" ? "No hay resultados que coincidan con la búsqueda o los filtros seleccionados." : "No hay notificaciones para mostrar."}
                description={query.trim() || statusFilter !== "all" ? "Probá modificar el texto de búsqueda o seleccionar otro estado." : "Las nuevas comunicaciones aparecerán en este listado."}
                filtered={false}
              />
            ) : (
              <div className="flex min-h-0 flex-col gap-3">
                <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
                  {shown.map((item) => (
                    <NotificationListItem
                      key={item.id}
                      item={item}
                      active={selected?.id === item.id}
                      onSelect={() => void selectNotification(item)}
                    />
                  ))}
                </div>
                <CatalogPagination
                  page={page}
                  total={filtered.length}
                  onPageChange={setPage}
                />
              </div>
            )}
          </AdminListPane>
        }
        detail={
          <div className={cn(!selected && "hidden lg:block")}>
            <NotificationDetail
              item={selected}
              scope={scope}
              workspace={workspace}
              loading={Boolean(actionLoading)}
              onBack={() => setSelected(null)}
              onUpdate={updateSelected}
              readOnly={mailbox === "sent"}
            />
          </div>
        }
      />
    </AdminPageShell>
  );
}

function NotificationListItem({
  item,
  active,
  onSelect,
}: {
  item: Notification;
  active: boolean;
  onSelect: () => void;
}) {
  const requestStatus = accessRequestStatus(item);
  return (
    <AdminListCard
      selected={active}
      onClick={onSelect}
      leading={
        <span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm">
          <Bell className="size-6" />
        </span>
      }
      title={item.title}
      badges={
        <>
          {requestStatus ? <RequestBadge status={requestStatus} /> : null}
          {item.deliveryOrigin === "ROL" ? <Badge className="rounded-full border border-[#819B56]/40 bg-[#819B56]/15 text-[#1D4F36]">Por rol</Badge> : null}
          {item.priority === "ALTA" ? <Badge variant="destructive" className="rounded-full">Importante</Badge> : null}
        </>
      }
      description={
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 min-w-0 flex-1">{item.message}</span>
          <Badge className={statusBadgeClass(item.status)}>{statuses[item.status]}</Badge>
        </span>
      }
      meta={formatCatalogDate(item.createdAt)}
      trailing={<ChevronRight />}
    />
  );
}

function NotificationDetail({
  item,
  scope,
  workspace,
  loading,
  onBack,
  onUpdate,
  readOnly,
}: {
  item: Notification | null;
  scope: Scope;
  workspace: PersonalWorkspace;
  loading: boolean;
  onBack: () => void;
  onUpdate: (action: NotificationAction) => Promise<void>;
  readOnly: boolean;
}) {
  if (!item) {
    return <AdminDetailPanel empty="Seleccioná una notificación para consultar su detalle." />;
  }
  const requestStatus = accessRequestStatus(item);
  const action = notificationAction(item, scope, workspace);
  const recipient = item.user
    ? [item.user.firstName, item.user.lastName].filter(Boolean).join(" ")
    : null;

  return (
    <AdminDetailPanel onBack={onBack}>
      <AdminDetailHeader
        title={item.title}
        leading={
          <span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm">
            <Bell className="size-8" />
          </span>
        }
        badge={
          <div className="flex flex-wrap gap-2">
            {requestStatus ? <RequestBadge status={requestStatus} prefix="Solicitud" /> : null}
            <Badge className={statusBadgeClass(item.status)}>{statuses[item.status]}</Badge>
          </div>
        }
      />
      <dl className="mt-6 grid gap-3">
        {recipient && scope === "admin" ? <CatalogDetailField icon={UserRound} label="Destinatario">{recipient}</CatalogDetailField> : null}
        {item.deliveryOrigin === "ROL" ? <CatalogDetailField icon={UserRound} label="Audiencia">Rol {item.role?.nombre ?? "administrador"}</CatalogDetailField> : null}
        {item.managementStatus && item.managementStatus !== "INFORMATIVA" ? <CatalogDetailField icon={CircleDot} label="Gestión compartida">{item.managementStatus.replaceAll("_", " ").toLowerCase()}</CatalogDetailField> : null}
        {requestStatus ? <CatalogDetailField icon={CircleDot} label="Estado de la solicitud"><RequestBadge status={requestStatus} /></CatalogDetailField> : null}
        <CatalogDetailField icon={MessageSquare} label="Mensaje">{item.message}</CatalogDetailField>
        <CatalogDetailField icon={Bell} label="Tipo">{item.type.replaceAll("_", " ").toLowerCase()}</CatalogDetailField>
        <CatalogDetailField icon={Flag} label="Prioridad">{priorities[item.priority]}</CatalogDetailField>
        <CatalogDetailField icon={CircleDot} label="Estado de lectura"><Badge className={statusBadgeClass(item.status)}>{statuses[item.status]}</Badge></CatalogDetailField>
        <CatalogDetailField icon={CalendarClock} label="Fecha">{formatCatalogDate(item.createdAt)}</CatalogDetailField>
      </dl>
      {!readOnly ? <AdminDetailActions>
        {action ? (
          <Button asChild className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : item.status === "NO_LEIDA" ? (
          <Button disabled={loading} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" onClick={() => void onUpdate("markAsRead")}><CheckCheck /> Marcar como leída</Button>
        ) : null}
        {item.status === "ARCHIVADA" ? (
          <Button disabled={loading} variant="outline" onClick={() => void onUpdate("markAsUnread")}><ArchiveRestore /> Restaurar</Button>
        ) : (
          <Button disabled={loading} variant="outline" onClick={() => void onUpdate("archive")}><Archive /> Archivar</Button>
        )}
      </AdminDetailActions> : null}
    </AdminDetailPanel>
  );
}

function RequestBadge({ status, prefix }: { status: string; prefix?: string }) {
  return (
    <Badge className="rounded-full border border-[#819B56]/40 bg-[#819B56]/15 text-[#1D4F36] hover:bg-[#819B56]/15">
      {prefix ? `${prefix} ${status.toLowerCase()}` : status}
    </Badge>
  );
}
