"use client";
import { useCallback, useEffect, useState } from "react";
import { listActivitySchedulesClient } from "../services/activity-schedules.service";
import type { ActivitySchedule, ActivityScheduleFilters } from "../types/activity-schedule.types";
export function useActivitySchedules(filters:ActivityScheduleFilters){const[data,setData]=useState<ActivitySchedule[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState(false);const{search,activityId,establishmentId,professorId,day,status}=filters;const refresh=useCallback(async()=>{setLoading(true);setError(false);try{setData(await listActivitySchedulesClient({search,activityId,establishmentId,professorId,day,status}));}catch{setError(true);}finally{setLoading(false);}},[search,activityId,establishmentId,professorId,day,status]);useEffect(()=>{void refresh();},[refresh]);return{data,loading,error,refresh};}
