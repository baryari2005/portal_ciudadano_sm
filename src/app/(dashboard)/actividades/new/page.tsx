import { redirect } from "next/navigation";

export default function LegacyNewActivityRoute() {
  redirect("/activities/new");
}
