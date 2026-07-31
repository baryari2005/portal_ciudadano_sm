export type Stat = {
  id: string;
  labelTop: string;
  labelBottom: string;
  value: number | string;
  iconName:
    | "Palmtree"
    | "FileSignature"
    | "ClipboardList"
    | "Plane"
    | "Gift"
    | "Default"
    | "Sunrise";
  href?: string; // opcional: navegar con Link
  onClick?: () => void; // opcional: handler custom
  highlight?: boolean;
  disabled?: boolean;
  disabledHint?: string;
};

export type OrgMember = {
  initials: string;
  name: string;
  role: string;
};
