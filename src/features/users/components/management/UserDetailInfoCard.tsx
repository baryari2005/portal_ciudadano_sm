import type { DetailCard } from "../../types/management.types";
import { StatusPill } from "./StatusPill";

type UserDetailInfoCardProps = {
  card: DetailCard;
};

export function UserDetailInfoCard({ card }: UserDetailInfoCardProps) {
  const Icon = card.icon;

  return (
    <section className="rounded-lg border border-[#dfe7dc] bg-white px-6 py-5">
      <h3 className="flex items-center gap-3 text-base font-extrabold text-primary">
        <Icon className="h-5 w-5" />
        {card.title}
      </h3>

      <dl className="mt-5 grid gap-4">
        {card.fields.map((field) => (
          <div
            key={field.label}
            className="grid gap-2 text-sm sm:grid-cols-[160px_1fr]"
          >
            <dt className="font-bold text-foreground/75">{field.label}</dt>
            <dd className="font-medium text-foreground/80">
              {field.status ? (
                <StatusPill status={field.status} />
              ) : (
                field.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
