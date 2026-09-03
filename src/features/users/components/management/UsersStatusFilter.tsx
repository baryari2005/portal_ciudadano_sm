import { Filter } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UsersStatusFilterValue = "all" | "active" | "inactive";

export function UsersStatusFilter({
  value,
  onChange,
}: {
  value: UsersStatusFilterValue;
  onChange: (value: UsersStatusFilterValue) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as UsersStatusFilterValue)}>
      <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-[#F1F5EC] px-5 text-base text-[#173C2A] shadow-sm focus:ring-[#819B56]/25">
        <Filter className="mr-2 h-5 w-5 shrink-0 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="active">Activos</SelectItem>
        <SelectItem value="inactive">Inactivos</SelectItem>
      </SelectContent>
    </Select>
  );
}
