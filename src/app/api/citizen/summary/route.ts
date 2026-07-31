import { NextRequest, NextResponse } from "next/server";
import { getCitizenSummary, listCitizenEnrollments } from "@/features/citizen/services/citizen.server";
import { getEnrollmentDocumentationSummaries } from "@/features/enrollment-documents/services/enrollment-documents.server";
import { getUnreadCount, listUserNotifications } from "@/features/notifications/services/notifications.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const [base, enrollments, unreadCount, latestNotifications] = await Promise.all([
      getCitizenSummary(user.id),
      listCitizenEnrollments(user.id),
      getUnreadCount(user.id),
      listUserNotifications(user.id, { pageSize: 5 }),
    ]);
    const summaries = await getEnrollmentDocumentationSummaries(enrollments.map((item) => item.id));
    const entries = enrollments.map((item) => ({ id: item.id, summary: summaries.get(item.id)! }));
    const observed = entries.filter((item) => item.summary.status === "OBSERVADA");
    const pending = entries.filter((item) => item.summary.status === "PENDIENTE");

    return NextResponse.json({
      data: {
        ...base,
        documentation: {
          pendingEnrollments: pending.length,
          observedEnrollments: observed.length,
          underReviewEnrollments: entries.filter((item) => item.summary.status === "EN_REVISION").length,
          completedEnrollments: entries.filter((item) => item.summary.status === "COMPLETA").length,
          priorityEnrollmentId: observed[0]?.id ?? pending[0]?.id ?? null,
        },
        notifications: { unreadCount, latest: latestNotifications.items },
      },
    });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar tu resumen.");
  }
}
