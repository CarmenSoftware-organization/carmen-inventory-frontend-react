import { PencilLine, ShoppingCart, Stamp, PackageCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/types/workflows";

/** Flat icon per role — used for the compact flow strip (icon, not dot) */
export const ROLE_ICON: Record<Role, LucideIcon> = {
  create: PencilLine,
  approve: Stamp,
  purchase: ShoppingCart,
  issue: PackageCheck,
};

/** Flat text/icon color per role — vivid single tone, no bg/ring (flat look) */
export const ROLE_TEXT: Record<Role, string> = {
  create: "text-primary",
  approve: "text-warning",
  purchase: "text-info",
  issue: "text-success",
};

/** Solid background — used for dots, indicator bars, KPI fills */
export const ROLE_SOLID: Record<Role, string> = {
  create: "bg-primary",
  approve: "bg-warning",
  purchase: "bg-info",
  issue: "bg-success",
};

/** Node border + soft fill — used for diagram nodes */
export const ROLE_NODE_BORDER: Record<Role, string> = {
  create: "border-primary/60 bg-primary/10",
  approve: "border-warning/60 bg-warning/10",
  purchase: "border-info/60 bg-info/10",
  issue: "border-success/60 bg-success/10",
};

/** Label text color — used for diagram labels */
export const ROLE_LABEL_COLOR: Record<Role, string> = {
  create: "text-primary",
  approve: "text-warning-foreground",
  purchase: "text-info-foreground",
  issue: "text-success-foreground",
};

