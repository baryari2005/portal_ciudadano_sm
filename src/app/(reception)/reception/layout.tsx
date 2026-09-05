import { ReceptionShell } from "@/features/reception/components/ReceptionShell";
import { GeneralSettingsProvider } from "@/features/general-settings/components/GeneralSettingsProvider";
export default function Layout({ children }: { children: React.ReactNode }) { return <GeneralSettingsProvider experience="reception"><ReceptionShell>{children}</ReceptionShell></GeneralSettingsProvider>; }
