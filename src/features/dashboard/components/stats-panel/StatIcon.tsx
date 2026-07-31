"use client";

import {
  ClipboardList,
  FileSignature,
  Gift,
  Palmtree,
  Plane,
  Sunrise,
} from "lucide-react";
import type { Stat as BaseStat } from "../../types/types";

type Props = {
  name: BaseStat["iconName"];
};

export function StatIcon({ name }: Props) {
  switch (name) {
    case "FileSignature":
      return <FileSignature className="h-10 w-10" />;
    case "ClipboardList":
      return <ClipboardList className="h-10 w-10" />;
    case "Plane":
      return <Plane className="h-10 w-10" />;
    case "Gift":
      return <Gift className="h-10 w-10" />;
    case "Sunrise":
      return <Sunrise className="h-10 w-10" />;
    default:
      return <Palmtree className="h-10 w-10" />;
  }
}
