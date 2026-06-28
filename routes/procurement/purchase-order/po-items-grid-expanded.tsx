import { useTranslations } from "use-intl";
import { type UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineBreakdown } from "./po-items-grid-breakdown";
import { LocationsEditor } from "./po-items-grid-locations";
import { SectionMiniLabel } from "./po-items-grid-shared";
import type { PoFormValues } from "./po-form-schema";

interface ExpandedRowProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  /** disabled แยกสำหรับ location editor (PO จาก price list ปล่อยให้แก้ได้) */
  readonly locationsDisabled: boolean;
  readonly readOnly: boolean;
  /** colspan = จำนวน visible columns ของ row หลัก */
  readonly colSpan: number;
  readonly onDelete: (index: number) => void;
}

/**
 * Desktop expanded row content — single `<tr>` ที่มี `<td colSpan>` ครอบ
 * 2-col layout (Locations editor | Line breakdown)
 */
export function ExpandedRow({
  form,
  index,
  disabled,
  locationsDisabled,
  readOnly,
  colSpan,
  onDelete,
}: ExpandedRowProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.purchaseOrder");
  return (
    <tr className="bg-muted/10 border-border/40 border-t">
      <td colSpan={colSpan} className="p-4">
        <div className="grid gap-4 lg:grid-cols-[6fr_4fr] xl:grid-cols-[7fr_3fr] 2xl:grid-cols-[3fr_1fr]">
          <div>
            <SectionMiniLabel>{tfl("location")}</SectionMiniLabel>
            <LocationsEditor
              form={form}
              index={index}
              disabled={locationsDisabled}
              readOnly={readOnly}
            />
          </div>
          <div>
            <SectionMiniLabel>{tfl("summary")}</SectionMiniLabel>
            <LineBreakdown form={form} index={index} />
            {!disabled && !readOnly && (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={() => onDelete(index)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {t("removeItem")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
