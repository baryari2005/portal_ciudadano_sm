"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AssistantResponse = {
  answer?: string;
  error?: string;
};

const starterQuestions = [
  "Como apruebo una licencia?",
  "Donde cargo el balance de vacaciones?",
  "Que permiso necesito para exportar usuarios?",
  "Como subo PDF de recibos?",
];

export function SupportAssistant() {
  const pathname = usePathname();
  const token = useAuth((state) => state.token);
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
          content: "No encuentro una sesion activa para consultar el asistente.",
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
            data.answer || "No pude generar una respuesta util en este momento.",
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
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#008C93]/10 px-3 py-1 text-xs font-medium text-[#007381]">
          <Sparkles className="h-3.5 w-3.5" />
          Asistente IA
        </div>

        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bot className="h-5 w-5 text-[#008C93]" />
            Preguntale al sistema como hacer una tarea
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Este primer MVP responde usando las guias del sistema y tus permisos
            actuales. No usa chunks ni indexacion todavia: cada consulta se arma
            con el contexto visible para tu usuario.
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

        <ScrollArea className="h-80 rounded-xl border border-slate-200 bg-slate-50">
          <div className="space-y-3 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "assistant"
                    ? "bg-white text-slate-800"
                    : "ml-auto bg-[#008C93] text-white"
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
            placeholder="Ejemplo: Como apruebo una licencia con adjuntos?"
            className="min-h-28 rounded-xl bg-white"
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => askAssistant(question)}
              disabled={loading || !question.trim()}
              className="h-11 rounded bg-[#008C93] hover:bg-[#007381]"
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
