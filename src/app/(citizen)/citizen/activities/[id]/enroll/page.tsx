"use client";

import { use } from "react";

import { CitizenEnrollmentConfirmationPage } from "@/features/citizen/components/CitizenEnrollmentConfirmationPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CitizenEnrollmentConfirmationPage id={id} />;
}
