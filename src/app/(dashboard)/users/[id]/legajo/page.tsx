"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Asterisk, FileUser } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CenteredSpinner } from "@/components/feedback/CenteredSpinner";
import AccessDenied403Page from "@/app/(dashboard)/403/page";

import {
  getUser,
  getUserPersonnelFile,
  upsertUserPersonnelFile,
} from "@/lib/api/users";

import { useCan } from "@/hooks/useCan";
import { LegajoForm } from "@/features/users/components/LegajoForm";

import type { LegajoValues } from "@/features/users/schemas/legajo.schema";
import {
  EMPLOYMENT_STATUS,
  CONTRACT_TYPES,
} from "@/features/users/schemas/legajo.schema";

type PersonnelFileDTO = {
  employeeNumber?: string | null;
  admissionDate?: string | null;
  terminationDate?: string | null;
  employmentStatus?: string | null;
  contractType?: string | null;
  position?: string | null;
  area?: string | null;
  department?: string | null;
  category?: string | null;
  matriculaProvincial?: string | null;
  matriculaNacional?: string | null;
  notes?: string | null;
};

type UpsertPersonnelFilePayload = Parameters<typeof upsertUserPersonnelFile>[1];

export default function UserLegajoPage() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan("legajo", "ver");

  if (!canView) {
    return <AccessDenied403Page />;
  }

  return <LegajoContent id={id} />;
}

function normalizePersonnelFile(
  pf: PersonnelFileDTO | null | undefined,
): Partial<LegajoValues> {
  const isEmployment = (
    value: unknown,
  ): value is LegajoValues["employmentStatus"] =>
    typeof value === "string" &&
    (EMPLOYMENT_STATUS as readonly string[]).includes(value);

  const isContract = (
    value: unknown,
  ): value is NonNullable<LegajoValues["contractType"]> =>
    typeof value === "string" &&
    (CONTRACT_TYPES as readonly string[]).includes(value);

  const parseEmployeeNumber = (
    value: string | null | undefined,
  ): number | null | undefined => {
    if (value === null) return null;
    if (value === undefined || value === "") return undefined;

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    employeeNumber: parseEmployeeNumber(pf?.employeeNumber),
    admissionDate: pf?.admissionDate ?? null,
    terminationDate: pf?.terminationDate ?? null,
    employmentStatus: isEmployment(pf?.employmentStatus)
      ? pf.employmentStatus
      : "ACTIVO",
    contractType: isContract(pf?.contractType) ? pf.contractType : undefined,
    position: pf?.position ?? "",
    area: pf?.area ?? "",
    department: pf?.department ?? "",
    category: pf?.category ?? "",
    matriculaProvincial: pf?.matriculaProvincial ?? "",
    matriculaNacional: pf?.matriculaNacional ?? "",
    notes: pf?.notes ?? "",
  };
}

function LegajoContent({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [initial, setInitial] = useState<Partial<LegajoValues> | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const [u, f] = await Promise.all([
          getUser(id),
          getUserPersonnelFile(id),
        ]);

        if (!mounted) return;

        setUserName(
          [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
            u?.userId ||
            "",
        );

        const personnelFile = f as PersonnelFileDTO | null | undefined;

        const normalized: Partial<LegajoValues> = personnelFile
          ? normalizePersonnelFile(personnelFile)
          : { employmentStatus: "ACTIVO" };

        setInitial(normalized);
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar el legajo");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading || !initial) {
    return <CenteredSpinner label="Cargando..." />;
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FileUser className="mr-2" />
            Cargar Legajo
            <Asterisk className="ml-4 h-4 w-4" />
            {userName}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <LegajoForm
            defaultValues={initial}
            onSubmit={async (values) => {
              await upsertUserPersonnelFile(
                id,
                values as UpsertPersonnelFilePayload,
              );
              toast.success("Guardado");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
