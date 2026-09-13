"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AdminDetailActions,
} from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ProfileDialogBody,
  ProfileDialogFooter,
  ProfileDialogHeader,
  ProfileFormField,
  profilePrimaryButtonClassName,
  profileSecondaryButtonClassName,
} from "@/components/layout/user-menu/ProfileDialogParts";
import { axiosInstance } from "@/lib/axios";

import { UserDocumentDetailView, type DocumentRow } from "./UserDocumentDetailView";

export function UserDocumentReviewPage({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    void Promise.all([
      axiosInstance.get("/user-documents"),
      axiosInstance.get(`/user-documents/${documentId}/download`),
    ])
      .then(([list, download]) => {
        setDocument(
          (list.data.data as DocumentRow[]).find(
            (item) => item.id === documentId,
          ) ?? null,
        );
        setUrl(download.data.data.url);
      })
      .catch(() => toast.error("No pudimos cargar el documento."))
      .finally(() => setLoading(false));
  }, [documentId]);
  async function review(status: "APROBADO" | "RECHAZADO") {
    if (!document) return;
    if (status === "RECHAZADO" && !reason.trim()) {
      toast.error("Indicá el motivo.");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(`/user-documents/${document.id}/review`, {
        status,
        reason: status === "RECHAZADO" ? reason : undefined,
      });
      toast.success(
        status === "APROBADO"
          ? "Documento aprobado y usuario notificado."
          : "Documento desaprobado y usuario notificado.",
      );
      router.replace("/user-documents");
    } catch {
      toast.error("No pudimos revisar el documento.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <UserDocumentDetailView document={document} url={url} loading={loading} backHref="/user-documents" renderActions={(document) => <>            {document.status !== "RECHAZADO" ? (
              <AdminDetailActions>
                {document.status === "PENDIENTE" ? (
                  <Button
                    className="bg-[var(--brand-primary)]"
                    disabled={saving}
                    onClick={() => void review("APROBADO")}
                  >
                    <CheckCircle2 />
                    Aprobar
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="text-red-700 hover:bg-red-50"
                  disabled={saving}
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle />
                  {document.status === "APROBADO" ? "Desaprobar" : "Rechazar"}
                </Button>
              </AdminDetailActions>
            ) : null}</>}>
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!saving) setRejectOpen(open);
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 sm:max-w-md">
          <ProfileDialogHeader
            icon={XCircle}
            title={
              document?.status === "APROBADO"
                ? "Desaprobar documento"
                : "Rechazar documento"
            }
            description="Indicá claramente el motivo. El ciudadano será notificado."
          />
          <ProfileDialogBody>
            <ProfileFormField label="Motivo *">
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                className="min-h-32"
              />
            </ProfileFormField>
          </ProfileDialogBody>
          <ProfileDialogFooter>
            <Button
              variant="outline"
              className={profileSecondaryButtonClassName}
              disabled={saving}
              onClick={() => setRejectOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className={profilePrimaryButtonClassName}
              disabled={saving || !reason.trim()}
              onClick={() => void review("RECHAZADO")}
            >
              {saving ? <Loader2 className="animate-spin" /> : <XCircle />}
              Confirmar y notificar
            </Button>
          </ProfileDialogFooter>
        </DialogContent>
      </Dialog>
    </UserDocumentDetailView>
  );
}
