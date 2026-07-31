import { cn } from "@/lib/utils";

type FormSectionDividerProps = {
  className?: string;
};

export function FormSectionDivider({ className }: FormSectionDividerProps) {
  return <div className={cn("h-px bg-border/60", className)} />;
}
