"use client";

import { useState } from "react";
import { toast } from "sonner";
import { exportUsersExcel } from "../services/export-users.client";
import { ExportUsersStats } from "../types/export-users.types";

export function useExportUsers() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ExportUsersStats | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setStats(null);

    try {
      const result = await exportUsersExcel();
      setStats(result);
      toast.success(
        `Export ready (${result.users} users, ${result.legajos} employee records)`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Export failed";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    stats,
    handleExport,
  };
}
