import { PackageMinus, PackagePlus, type LucideIcon } from "lucide-react";
import { createStatusConfig, createVariantMap } from "./status-config";

/** Badge className + label for IA document-level status */
export const IA_STATUS_CONFIG = createStatusConfig(
  ["draft", "in_progress", "completed", "voided"] as const,
  {
    completed: {
      className:
        "bg-success text-success-foreground border-transparent px-2",
    },
  },
);

/** Badge variant for IA document-level status */
export const IA_STATUS_VARIANT = createVariantMap({
  draft: "secondary",
  in_progress: "warning",
  completed: "success",
  voided: "destructive",
});

/** Badge className + label for IA adjustment type */
export const IA_TYPE_CONFIG = createStatusConfig(
  ["stock-in", "stock-out"] as const,
  {
    "stock-in": { label: "STOCK IN" },
    "stock-out": { label: "STOCK OUT" },
  },
);

/** Badge variant for IA adjustment type */
export const IA_TYPE_VARIANT = createVariantMap({
  "stock-in": "success",
  "stock-out": "destructive",
});

/** Lucide icon for IA adjustment type — used in badges + add buttons */
export const IA_TYPE_ICON: Record<"stock-in" | "stock-out", LucideIcon> = {
  "stock-in": PackagePlus,
  "stock-out": PackageMinus,
};

