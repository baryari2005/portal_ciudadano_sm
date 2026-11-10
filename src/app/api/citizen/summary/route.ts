import { NextRequest, NextResponse } from "next/server";
import { getCitizenSummary } from "@/features/citizen/services/citizen.server";
import { getEnrollmentDocumentationSummaries } from "@/features/enrollment-documents/services/enrollment-documents.server";
import { listUserNotifications } from "@/features/notifications/services/notifications.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // Documentation needs ordered enrollment IDs, not the enrollment screen DTO
    // (which also loads schedules, next classes and waitlist positions).
    const documentationPromise = prisma.inscripcion.findMany({
      where: { usuarioId: user.id },
      select: { id: true },
      orderBy: { fechaInscripcion: "desc" },
    }).then(async (enrollments) => {
      const summaries = await getEnrollmentDocumentationSummaries(enrollments.map((item) => item.id));
      return enrollments.map((item) => ({ id: item.id, summary: summaries.get(item.id)! }));
    });
    const [base, entries, latestNotifications] = await Promise.all([
      getCitizenSummary(user.id),
      documentationPromise,
      listUserNotifications(user.id, { pageSize: 5 }),
    ]);
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
        notifications: { unreadCount: latestNotifications.meta.unreadCount, latest: latestNotifications.items },
      },
    });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar tu resumen.");
  }
}
