"use client";

import {
  Eye,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Search,
  FileSignature,
  FileText,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarPlus,
  LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  eye: Eye,
  plus: Plus,
  pencil: Pencil,
  trash: Trash2,
  upload: Upload,
  download: Download,
  search: Search,
  fileSignature: FileSignature,
  fileText: FileText,
  checkCircle: CheckCircle2,
  xCircle: XCircle,
  ban: Ban,
  calendarPlus: CalendarPlus,
};

type Props = {
  name?: string | null;
  className?: string;
};

export function PermissionIcon({
  name,
  className = "h-4 w-4 text-muted-foreground",
}: Props) {
  if (!name) return null;

  const Icon = iconMap[name];

  if (!Icon) return null;

  return <Icon className={className} />;
}
