import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/server-auth";

const scopeSchema = z.enum(["citizen", "personnel", "profile"]);
const modeSchema = z.enum(["create", "edit"]);
const statusSchema = z.record(z.string(), z.enum(["pending", "unsaved", "valid", "invalid"]));
const saveSchema = z.object({
  id: z.string().cuid().optional(),
  scope: scopeSchema,
  mode: modeSchema,
  subjectUserId: z.string().uuid().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  currentStep: z.number().int().min(1).max(20),
  stepStatuses: statusSchema,
  viewMode: z.enum(["workflow", "full"]),
});

function authorize(user: Awaited<ReturnType<typeof requireAuth>>, scope: z.infer<typeof scopeSchema>, mode: z.infer<typeof modeSchema>) {
  if (scope !== "profile") requirePermission(user, "usuarios", mode === "create" ? "crear" : "editar");
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const scope = scopeSchema.parse(request.nextUrl.searchParams.get("scope"));
    const mode = modeSchema.parse(request.nextUrl.searchParams.get("mode"));
    const subjectUserId = request.nextUrl.searchParams.get("subjectUserId");
    authorize(user, scope, mode);
    const draft = await prisma.usuarioBorrador.findFirst({
      where: { ownerId: user.id, scope, mode, subjectUserId: subjectUserId || null },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ data: draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos cargar el borrador.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const input = saveSchema.parse(await request.json());
    authorize(user, input.scope, input.mode);
    const safePayload = { ...input.payload };
    delete safePayload.password;
    delete safePayload.currentPassword;
    delete safePayload.newPassword;
    const data = {
      scope: input.scope,
      mode: input.mode,
      subjectUserId: input.subjectUserId ?? null,
      payload: safePayload as Prisma.InputJsonValue,
      currentStep: input.currentStep,
      stepStatuses: input.stepStatuses as Prisma.InputJsonValue,
      viewMode: input.viewMode,
    };
    const existing = input.id
      ? await prisma.usuarioBorrador.findFirst({ where: { id: input.id, ownerId: user.id } })
      : await prisma.usuarioBorrador.findFirst({ where: { ownerId: user.id, scope: input.scope, mode: input.mode, subjectUserId: input.subjectUserId ?? null }, orderBy: { updatedAt: "desc" } });
    const draft = existing
      ? await prisma.usuarioBorrador.update({ where: { id: existing.id }, data })
      : await prisma.usuarioBorrador.create({ data: { ...data, ownerId: user.id } });
    return NextResponse.json({ data: draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos guardar el borrador.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const id = z.string().cuid().parse(request.nextUrl.searchParams.get("id"));
    await prisma.usuarioBorrador.deleteMany({ where: { id, ownerId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos descartar el borrador.";
    return NextResponse.json({ message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
