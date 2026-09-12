export function documentDisplayStatus(document: { status: string; validity: string } | null) {
  if (!document) return "missing";
  if (document.status === "APROBADO" && ["PROXIMO_A_VENCER", "VENCIDO"].includes(document.validity)) {
    return document.validity;
  }
  return document.status;
}

export function getMissingDocumentRequirements<T extends { id: string }>(
  requirements: T[],
  documents: Array<{ id: string; current: { status: string; validity: string } | null }>,
) {
  return requirements.filter((item) => {
    const document = documents.find((entry) => entry.id === item.id);
    return document !== undefined && documentDisplayStatus(document.current) === "missing";
  });
}
