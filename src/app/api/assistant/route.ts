import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import {
  formatGuidesForAssistant,
  getVisibleHelpGuides,
} from "@/features/support/lib/visible-help-guides";
import type { HelpCategory } from "@/features/support/lib/help-guides";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const assistantModel = process.env.OPENAI_ASSISTANT_MODEL || "gpt-4.1-mini";

type HelpAssistantRequest = {
  question?: string;
  currentPath?: string | null;
};

function buildInstructions(context: string) {
  return [
    "Sos un asistente de ayuda del sistema municipal de actividades.",
    "Responde siempre en espanol claro y concreto.",
    "Solo debes responder en base al contexto provisto sobre pantallas, permisos, rutas y pasos del sistema.",
    "Si la respuesta no esta sustentada por el contexto, dilo explicitamente y sugiere revisar la seccion /help o consultar a un administrador.",
    "No inventes modulos, permisos, botones ni comportamientos.",
    "Cuando sea util, incluye la ruta a la que debe ir el usuario.",
    "Prioriza pasos accionables y breves.",
    "",
    "Contexto disponible de guias y permisos:",
    context,
  ].join("\n");
}

function buildInput(question: string, currentPath?: string | null) {
  return [
    `Ruta actual del usuario: ${currentPath || "No informada"}`,
    `Pregunta del usuario: ${question}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const loggedInUser = await requireAuth(req);

    if (!openai) {
      return NextResponse.json(
        {
          error:
            "Falta configurar OPENAI_API_KEY en el entorno del servidor para usar el asistente.",
        },
        { status: 500 },
      );
    }

    const body = (await req.json()) as HelpAssistantRequest;
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json(
        { error: "Debes enviar una pregunta para el asistente." },
        { status: 400 },
      );
    }

    const path = body.currentPath ?? "";
    const category: HelpCategory = path.startsWith("/citizen") ? "citizen" : path.startsWith("/teacher") ? "teacher" : path.startsWith("/access") ? "reception" : "administration";
    const guides = getVisibleHelpGuides(loggedInUser.permisos ?? [], category);
    const context = formatGuidesForAssistant(guides);

    const response = await openai.responses.create({
      model: assistantModel,
      instructions: buildInstructions(context),
      input: buildInput(question, body.currentPath),
    });

    const answer =
      response.output_text?.trim() ||
      "No pude generar una respuesta util en este momento.";

    return NextResponse.json({
      answer,
      model: assistantModel,
      guideCount: guides.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del asistente.";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
