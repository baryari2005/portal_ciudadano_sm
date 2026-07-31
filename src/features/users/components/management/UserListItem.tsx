import { ChevronRight, Mail } from "lucide-react";
import { AdminListCard } from "@/components/shared/admin-patterns";
import type { ManagedUser } from "../../types/management.types";
import { RolePill, StatusPill } from "./StatusPill";
import { UserAvatarMark } from "./UserAvatarMark";

export function UserListItem({ user, selected, onSelect }: { user: ManagedUser; selected: boolean; onSelect: (userId: string) => void }) {
  return <AdminListCard onClick={() => onSelect(user.id)} selected={selected} leading={<UserAvatarMark user={user} />} title={user.userId} badges={<StatusPill status={user.status} />} description={user.fullName} meta={<span className="flex items-center gap-2"><Mail className="size-4 text-[var(--brand-primary)]" />{user.email}</span>} trailing={<span className="flex items-center gap-4"><RolePill role={user.role} /><ChevronRight className="size-5" /></span>} />;
}
