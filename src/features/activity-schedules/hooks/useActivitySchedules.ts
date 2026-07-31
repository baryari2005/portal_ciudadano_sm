"use client";
import { useCallback, useEffect, useState } from "react";
import { listActivitySchedulesClient } from "../services/activity-schedules.service";
import type { ActivitySchedule, ActivityScheduleFilters } from "../types/activity-schedule.types";
export function useActivitySchedules(filters:ActivityScheduleFilters){const[data,setData]=useState<ActivitySchedule[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState(false);const refresh=useCallback(async()=>{setLoading(true);setError(false);try{setData(await listActivitySchedulesClient(filters));}catch{setError(true);}finally{setLoading(false);}},[filters.search,filters.activityId,filters.establishmentId,filters.professorId,filters.day,filters.status]);useEffect(()=>{void refresh();},[refresh]);return{data,loading,error,refresh};}

