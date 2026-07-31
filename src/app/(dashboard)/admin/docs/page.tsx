"use client";

import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";
import PdfUploader from "@/features/admin/components/PdfUploader";

export default function AdminDocsPage() {
  const canAccess = useCan("recibos", "subir");

  if (!canAccess) {
    return <AccessDenied403Page />;
  }

  return (
    <div className="space-y-4">
      <PdfUploader onUploaded={(f) => console.log("PDF:", f)} />
    </div>
  );
}
