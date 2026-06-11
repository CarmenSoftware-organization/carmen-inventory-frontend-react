
import { useState } from "react";
import { useUnsavedChanges } from "./use-unsaved-changes";

interface UseDiscardConfirmOptions {
  readonly isDirty: boolean;
  readonly isPending?: boolean;
  readonly enableBeforeUnload?: boolean;
}

export interface DiscardDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export interface UseDiscardConfirmResult {
  readonly confirm: (action: () => void) => void;
  readonly dialogProps: DiscardDialogProps;
}

/**
 * Hook ยืนยันการทิ้งการเปลี่ยนแปลงในฟอร์ม
 *
 * เปิด confirm dialog เมื่อ `isDirty=true` ก่อนเรียก action ที่จะทำให้ข้อมูลหาย
 * (cancel, navigate back ฯลฯ) ถ้าไม่ dirty จะเรียก action ทันที
 * บล็อกการทำงานระหว่าง `isPending=true` เพื่อกัน race ตอน save
 * เปิด `beforeunload` warning อัตโนมัติเมื่อ dirty (ปิดได้ผ่าน option)
 *
 * @example
 * const discard = useDiscardConfirm({
 *   isDirty: form.formState.isDirty,
 *   isPending,
 * });
 * const handleBack = () => discard.confirm(() => router.push("/list"));
 * // ใน JSX:
 * <DiscardDialog {...discard.dialogProps} variant="warning" />
 */
export function useDiscardConfirm({
  isDirty,
  isPending = false,
  enableBeforeUnload = true,
}: UseDiscardConfirmOptions): UseDiscardConfirmResult {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useUnsavedChanges(enableBeforeUnload && isDirty);

  const confirm = (action: () => void) => {
    if (isPending) return;
    if (isDirty) {
      setPendingAction(() => action);
      setOpen(true);
    } else {
      action();
    }
  };

  const handleConfirm = () => {
    pendingAction?.();
    setPendingAction(null);
    setOpen(false);
  };

  const handleCancel = () => {
    setPendingAction(null);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPendingAction(null);
  };

  return {
    confirm,
    dialogProps: {
      open,
      onOpenChange: handleOpenChange,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
