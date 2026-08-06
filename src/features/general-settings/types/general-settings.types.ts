export type ExperienceKey = "administration" | "reception" | "teacher" | "citizen";

export type ExperiencePalette = {
  primary: string;
  primaryHover: string;
  primaryStrong: string;
  secondary: string;
  accent: string;
  highlight: string;
  neutral: string;
  page: string;
  panel: string;
  control: string;
  search: string;
  border: string;
  borderSoft: string;
  heading: string;
  ink: string;
  text: string;
  muted: string;
};

export type ExperiencePalettes = Record<ExperienceKey, ExperiencePalette>;

export type GeneralSettings = {
  pageSize: number;
  loginCollageImages: [string, string, string, string];
  experiencePalettes: ExperiencePalettes;
};
