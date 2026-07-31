"use client";
import { use } from "react";
import AccessDenied403Page from "../../../403/page";
import { AttendanceQrScanPage } from "@/features/attendance-qr/components/AttendanceQrScanPage";
import { useCan } from "@/hooks/useCan";
export default function Page({params}:{params:Promise<{sessionId:string}>}){const{sessionId}=use(params),canView=useCan("attendance","ver"),canAssign=useCan("attendance","asignar");return canView&&canAssign?<AttendanceQrScanPage sessionId={sessionId}/>:<AccessDenied403Page/>}
