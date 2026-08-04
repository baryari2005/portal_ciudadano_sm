"use client";

import { use } from "react";

import { CitizenEnrollmentSchedulePage } from "@/features/citizen/components/CitizenEnrollmentSchedulePage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CitizenEnrollmentSchedulePage enrollmentId={id} />;
}
