
import { type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { PoFormValues } from "./po-form-schema";

/** Props ของ row/card (เหมือนกันทั้ง desktop + mobile) */
export interface PoItemRowProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly showApproveCheckbox: boolean;
  readonly isSelected: boolean;
  /** index-aware เพื่อให้ caller ส่ง callback ที่ stable (memo-friendly) */
  readonly onToggleSelected: (index: number, checked: boolean) => void;
  readonly isOpen: boolean;
  readonly onToggleOpen: (index: number) => void;
}

/**
 * Small uppercase label ใช้เหนือ sub-block ใน expanded row
 * (e.g. "DELIVERY LOCATIONS", "LINE BREAKDOWN")
 */
export function SectionMiniLabel({ children }: { readonly children: ReactNode }) {
  return (
    <p className="text-muted-foreground mb-2 font-semibold tracking-wider uppercase">
      {children}
    </p>
  );
}

/** Field cell บน mobile card — uppercase label + value */
export function MiniField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 font-semibold tracking-wider uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
