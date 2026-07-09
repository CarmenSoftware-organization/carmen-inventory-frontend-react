import { useState } from "react";

export interface DuplicateProductDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly productName?: string;
}

export interface UseDuplicateProductConfirmResult {
  readonly confirm: (action: () => void, productName?: string) => void;
  readonly dialogProps: DuplicateProductDialogProps;
}

/**
 * Hook ยืนยันการเลือก product ที่ซ้ำกับ row อื่นในลิสต์
 *
 * เรียก `confirm(action, name)` เฉพาะตอน caller ตรวจพบว่า product ซ้ำ — จะเปิด
 * dialog แล้วรัน `action` เมื่อกดยืนยัน / ไม่ทำอะไรเมื่อ cancel (ผู้เรียกยังไม่ได้
 * apply ค่าใหม่ ค่าเดิมจึงคงอยู่เอง = revert) ถ้าไม่ซ้ำให้ผู้เรียก apply ตรงๆ
 * mirror pattern ของ [[use-discard-confirm]]
 *
 * @example
 * const dup = useDuplicateProductConfirm();
 * // ที่จุดเลือก product:
 * isDup ? dup.confirm(() => field.onChange(id), product?.name) : field.onChange(id);
 * // ใน JSX:
 * <DuplicateProductDialog {...dup.dialogProps} />
 */
export function useDuplicateProductConfirm(): UseDuplicateProductConfirmResult {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [productName, setProductName] = useState<string | undefined>(undefined);

  const confirm = (action: () => void, name?: string) => {
    setPendingAction(() => action);
    setProductName(name);
    setOpen(true);
  };

  const reset = () => {
    setPendingAction(null);
    setProductName(undefined);
    setOpen(false);
  };

  const handleConfirm = () => {
    pendingAction?.();
    reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    else setOpen(true);
  };

  return {
    confirm,
    dialogProps: {
      open,
      onOpenChange: handleOpenChange,
      onConfirm: handleConfirm,
      onCancel: reset,
      productName,
    },
  };
}
