import { permanentRedirect } from "next/navigation";

export default function LegacyRequestAccessPage() {
  permanentRedirect("/request-access");
}
