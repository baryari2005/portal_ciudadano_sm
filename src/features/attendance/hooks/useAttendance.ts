"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getAttendanceRosterClient, listAttendanceSessionsClient } from "../services/attendance.service";
import type { AttendanceFilters, AttendanceRoster, AttendanceSession } from "../types/attendance.types";

export function useAttendanceSessions(filters: AttendanceFilters) {
  const [data, setData] = useState<AttendanceSession[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 8, pageCount: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await listAttendanceSessionsClient(filters);
      setData(result.data);
      setMeta(result.meta);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => { void load(); }, [load]);
  return { data, meta, loading, error, refresh: load };
}

export function useAttendanceRoster(id: string) {
  const pathname = usePathname();
  const showTeacherAssignmentError = pathname === `/attendance/${id}`;
  const [data, setData] = useState<AttendanceRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await getAttendanceRosterClient(id, showTeacherAssignmentError));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, showTeacherAssignmentError]);
  useEffect(() => { void load(); }, [load]);
  return { data, setData, loading, error, refresh: load };
}
