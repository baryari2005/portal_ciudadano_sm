export type SplitStats = {
  bucket: string;
  period: string;
  sourcePath: string;
  prefixPath: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;

  totalPages: number;
  detectedPagesWithCuil: number;
  uniqueCuils: number;
  uploaded: number;
  duplicates: { count: number; cuils: string[] };
  unmatched: { count: number; pages: number[] };
  sampleCuils: string[];
};

export type ReceiptType = "SALARIO" | "VACACIONES" | "AGUINALDO" | "BONO";
