import { redirect } from "next/navigation";

export default function LegacyNewActivityPage() {
  redirect("/activities/new");
}
