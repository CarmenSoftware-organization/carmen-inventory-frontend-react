import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { X } from "lucide-react";
import { ItemStatusDot } from "@/components/share/item-status-dot";
import { PR_ITEM_STATUS_CONFIG } from "@/constant/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";
import { STATUS_NORMALIZE } from "./helpers";

export const StatusCell = memo(function StatusCell({
  control,
  form,
  index,
  role,
  isDisabled,
}: {
  control: Control<PrFormValues>;
  form?: UseFormReturn<PrFormValues>;
  index: number;
  role?: string;
  /** ฟอร์มอยู่โหมดอ่าน — ปุ่มล้างสถานะต้องหายไป ไม่ใช่แค่จางลง */
  isDisabled?: boolean;
}) {
  "use no memo";
  const currentStageStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const initialStageStatus =
    useWatch({ control, name: `items.${index}._initial_stage_status` }) ?? "";

  const normalizedStatus =
    STATUS_NORMALIZE[currentStageStatus] ?? currentStageStatus;
  const initialNormalized =
    STATUS_NORMALIZE[initialStageStatus] ?? initialStageStatus;
  const config =
    PR_ITEM_STATUS_CONFIG[normalizedStatus] ?? PR_ITEM_STATUS_CONFIG.pending;

  // ต้องเช็คโหมดอ่านด้วย — ของเดิมดูแค่ role ทำให้ผู้อนุมัติกดล้างสถานะได้ทั้งที่
  // ยังไม่ได้กดแก้ไข (เกณฑ์เดียวกับ PO ที่ใช้ isApprover && isEditMode)
  const canEdit =
    !!form &&
    !isDisabled &&
    (role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.PURCHASE);

  // stage purchase เปลี่ยนสถานะแถวที่ approve มาได้ (ผลของ stage ก่อนหน้า ไม่ใช่
  // คำตัดสินของ stage นี้) — แถวที่ถูก reject มายังล็อก ตรงกับ useIsRowLocked
  const isLockedFromServer =
    (initialNormalized === PR_ITEM_STAGE_STATUS.APPROVED &&
      role !== STAGE_ROLE.PURCHASE) ||
    initialNormalized === PR_ITEM_STAGE_STATUS.REJECTED;

  const handleReset = () => {
    form?.setValue(`items.${index}.stage_status`, PR_ITEM_STAGE_STATUS.PENDING);
    form?.setValue(
      `items.${index}.current_stage_status`,
      PR_ITEM_STAGE_STATUS.PENDING,
    );
  };

  if (!currentStageStatus) return null;

  const showReset =
    canEdit &&
    !isLockedFromServer &&
    (normalizedStatus === PR_ITEM_STAGE_STATUS.APPROVED ||
      normalizedStatus === PR_ITEM_STAGE_STATUS.REJECTED ||
      normalizedStatus === PR_ITEM_STAGE_STATUS.REVIEW);

  return (
    <ItemStatusDot
      status={normalizedStatus}
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
