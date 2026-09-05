"use client";

import { PersonalProfilePage } from "@/features/citizen/components/CitizenProfilePage";
import { ReceptionMobileProfile } from "@/features/reception/components/mobile/ReceptionMobileProfile";
import { ReceptionMobileHeader } from "@/features/reception/components/mobile/ReceptionMobileHeader";

export default function Page() {
  return <><ReceptionMobileHeader/><PersonalProfilePage workspace="reception" renderMobileProfile={(props)=><ReceptionMobileProfile {...props}/>}/></>;
}
