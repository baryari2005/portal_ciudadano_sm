import { Import, type LucideProps } from "lucide-react";

export function ExportIcon(props: LucideProps) {
  return (
    <Import {...props} className={`${props.className ?? ""} scale-y-[-1]`} />
  );
}
