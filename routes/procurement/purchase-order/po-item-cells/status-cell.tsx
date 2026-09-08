import { memo } from "react";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { ItemStatusDot } from "@/components/share/item-status-dot";
import {
  PO_ITEM_STATUS_CONFIG,
  normalizePoItemStatus,
} from "@/constant/purchase-order";
import type { PoFormValues } from "../po-form-schema";

export const StatusCell = memo(function StatusCell({
  control,
  form,
  index,
  canReset = false,
}: {
  control: Control<PoFormValues>;
  form?: UseFormReturn<PoFormValues>;
  index: number;
  /** ผู้อนุมัติในโหมดแก้ไขเท่านั้นที่ล้างสถานะกลับเป็นรอได้ */
  canReset?: boolean;
}) {
  "use no memo";
  const rawStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ||
    "pending";
  const status = normalizePoItemStatus(rawStatus);
  const config = PO_ITEM_STATUS_CONFIG[status] ?? PO_ITEM_STATUS_CONFIG.pending;

  const handleReset = () => {
    form?.setValue(`items.${index}.stage_status`, "pending");
    form?.setValue(`items.${index}.current_stage_status`, "pending");
  };

  // แถวที่ยังรออยู่ไม่มีอะไรให้ล้าง
  const showReset = canReset && !!form && status !== "pending";

  // จุดสถานะตัวเดียวกับ PR — PO ใช้ชุดสถานะเดียวกันเป๊ะ ไม่มีเหตุให้หน้าตาต่าง
  return (
    <ItemStatusDot
      status={status}
      label={config.label}
      tooltipExtra={
        showReset && (
          <button
            type="button"
            aria-label="Reset status"
            title="Clear"
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded focus-visible:outline-none"
            onClick={handleReset}
          >
            <X className="size-3.5" />
          </button>
        )
      }
    />
  );
});

/**
 * Merged qty + order unit (Receiving-style) — qty ระดับ item เป็น read-only
 * sum ของ locations.order_qty; unit (order_unit_id) แก้ได้ใน addon
 */
