import { cn } from "@/lib/utils";

type FormErrorMessageProps = {
  message?: unknown;
  className?: string;
};

export function FormErrorMessage({
  message,
  className,
}: FormErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p className={cn("text-xs text-destructive", className)}>
      {String(message)}
    </p>
  );
}
