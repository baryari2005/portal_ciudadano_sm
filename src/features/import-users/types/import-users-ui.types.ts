export type ImportRowError = {
  index: number;
  source: "pdf" | "excel";
  rowRef: string;
  message: string;
  status?: number;
};

export type ImportExecutionResult = {
  creds: Array<{
    userId: string;
    email: string;
    tempPassword: string;
    status: "created" | "updated";
  }>;
  okCount: number;
  failCount: number;
  errors: ImportRowError[];
};
