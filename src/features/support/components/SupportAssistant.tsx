"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { getVisibleHelpGuides } from "../lib/visible-help-guides";
import type { HelpCategory } from "../lib/help-guides";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AssistantResponse = {
  answer?: string;
  error?: string;
};

export function SupportAssistant() {
  const pathname = usePathname();
  const token = useAuth((state) => state.token);
  const permissions = useAuth((state) => state.user?.permisos ?? []);
  const category: HelpCategory = pathname.startsWith("/citizen") ? "citizen" : pathname.startsWith("/teacher") ? "teacher" : pathname.startsWith("/reception") || pathname.startsWith("/access") ? "reception" : "administration";
  const starterQuestions = useMemo(() => {
    const categories = new Set(
      getVisibleHelpGuides(permissions, category).map((guide) => guide.category),
    );
    return [
      ...(category === "citizen" ? ["¿Cómo me inscribo a una actividad?", "¿Cómo cambio los horarios de una inscripción?", "¿Cómo consulto mis próximas clases?"] : []),
      ...(categories.has("teacher") ? ["¿Cómo tomo asistencia?"] : []),
      ...(categories.has("reception") ? ["¿Cómo valido un ingreso por QR?"] : []),
      ...(categories.has("administration")
        ? ["¿Cómo creo una actividad completa?"]
        : []),
    ];
  }, [category, permissions]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Puedo responder preguntas sobre las funciones del sistema usando las guias y permisos disponibles para tu usuario.",
    },
  ]);

  const askAssistant = async (nextQuestion: string) => {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion || loading) return;

    if (!token) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "No encuentro una sesion activa para consultar el asistente.",
        },
      ]);
      return;
    }

    setLoading(true);
    setQuestion("");

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedQuestion,
      },
    ]);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          currentPath: pathname,
        }),
      });

      const data = (await response.json()) as AssistantResponse;

      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar al asistente.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            data.answer ||
            "No pude generar una respuesta util en este momento.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Ocurrio un error inesperado al consultar el asistente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-[#DDE8D7] shadow-sm">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#DDEED2] px-3 py-1 text-xs font-medium text-[#1D4F36]">
          <Sparkles className="h-3.5 w-3.5" />
          Asistente IA
        </div>

        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bot className="h-5 w-5 text-[#1D4F36]" />
            Preguntale al sistema como hacer una tarea
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Responde usando únicamente las guías visibles para los permisos
            actuales de tu cuenta.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {starterQuestions.map((item) => (
            <Button
              key={item}
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={loading}
              onClick={() => askAssistant(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-80 rounded-xl border border-[#DDE8D7] bg-[#F7FBF5]">
          <div className="space-y-3 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "assistant"
                    ? "bg-white text-slate-800"
                    : "ml-auto bg-[#1D4F36] text-white",
                )}
              >
                <div className="mb-1 text-xs font-medium uppercase tracking-wide opacity-70">
                  {message.role === "assistant" ? "Asistente" : "Vos"}
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}

            {loading ? (
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pensando una respuesta...
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className="space-y-3">
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ejemplo: ¿Cómo genero las clases de un horario?"
            className="min-h-28 rounded-xl bg-white"
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => askAssistant(question)}
              disabled={loading || !question.trim()}
              className="h-11 rounded bg-[#1D4F36] hover:bg-[#163D2A]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <SendHorizontal className="h-4 w-4" />
                  Preguntar
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
