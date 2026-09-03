"use client";

import { use } from "react";
import { CitizenEnrollmentDetailPage } from "@/features/citizen/components/CitizenEnrollmentDetailPage";

export default function Page({params}:{params:Promise<{id:string}>}){const{id}=use(params);return <CitizenEnrollmentDetailPage enrollmentId={id}/>}
