"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, CircleAlert, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/stores/auth";
import { HELP_CATEGORY_META, type HelpCategory, type HelpGuide } from "../lib/help-guides";
import { getVisibleHelpGuides, getVisibleHelpLinks } from "../lib/visible-help-guides";
import { SupportAssistant } from "./SupportAssistant";

function GuideCard({ guide }: { guide: HelpGuide }) {
  const permissions = useAuth((state) => state.user?.permisos ?? []);
  const links = getVisibleHelpLinks(permissions, guide);
  return (
    <Card id={guide.id} className="scroll-mt-24 border-[#DDE8D7] bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-extrabold text-[#1D4F36]">{guide.title}</CardTitle>
        <p className="text-sm leading-6 text-[#5F6F68]">{guide.description}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-3">
          {guide.steps.map((step, index) => <li key={`${guide.id}-${index}`} className="flex gap-3 text-sm leading-6 text-[#294B3B]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#DDEED2] text-xs font-extrabold text-[#1D4F36]">{index + 1}</span><span>{step}</span></li>)}
        </ol>
        {guide.warnings?.length ? <div className="rounded-2xl border border-[#819B56]/30 bg-[#F3F8EF] p-4"><div className="flex items-center gap-2 font-bold text-[#1D4F36]"><CircleAlert className="size-4"/>Tené en cuenta</div><ul className="mt-2 space-y-1 text-sm leading-6 text-[#496557]">{guide.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div> : null}
        {links.length ? <div className="flex flex-wrap gap-2">{links.map((link) => <Button key={link.href} asChild variant="outline" className="border-[#819B56]/40 text-[#1D4F36] hover:bg-[#EEF6E9]"><Link href={link.href}>{link.label}<ChevronRight className="size-4"/></Link></Button>)}</div> : null}
      </CardContent>
    </Card>
  );
}

export function SupportPageClient() {
  const pathname = usePathname();
  const permissions = useAuth((state) => state.user?.permisos ?? []);
  const [query, setQuery] = useState("");
  const category: HelpCategory = pathname.startsWith("/citizen") ? "citizen" : pathname.startsWith("/teacher") ? "teacher" : pathname.startsWith("/access") ? "reception" : "administration";
  const visible = useMemo(() => getVisibleHelpGuides(permissions, category), [category, permissions]);
  const guides = useMemo(() => { const normalized = query.trim().toLocaleLowerCase("es"); return visible.filter((guide) => !normalized || [guide.title, guide.description, ...guide.keywords, ...guide.steps].join(" ").toLocaleLowerCase("es").includes(normalized)); }, [query, visible]);
  const categoryMeta = HELP_CATEGORY_META[category];

  return <main className="min-h-full bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
    <section className="overflow-hidden rounded-3xl bg-[#1D4F36] px-6 py-8 text-white shadow-lg sm:px-8">
      <Badge className="bg-[#819B56] text-white">Centro de ayuda</Badge>
      <h1 className="mt-4 max-w-3xl text-3xl font-extrabold sm:text-4xl">Ayuda de {categoryMeta.label}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">{categoryMeta.description} Acá sólo vas a ver las tareas de la experiencia actual.</p>
      <div className="relative mt-6 max-w-2xl"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#5F6F68]"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tarea, pantalla o tema..." className="h-12 border-white/20 bg-white pl-12 text-[#173C2A] placeholder:text-[#718078]"/></div>
    </section>

    {guides.length ? <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">{guides.map((guide) => <GuideCard key={guide.id} guide={guide}/>)}</div> : <Card className="mt-6 border-[#DDE8D7]"><CardContent className="py-10 text-center text-[#5F6F68]">No encontramos guías de esta experiencia que coincidan con tu búsqueda y tus permisos.</CardContent></Card>}
    <div className="mt-8"><SupportAssistant /></div>
  </main>;
}
