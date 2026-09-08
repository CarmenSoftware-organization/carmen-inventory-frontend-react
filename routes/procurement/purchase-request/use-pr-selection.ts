import { useCallback, useMemo, useState } from "react";
import { PR_STATUS, type PurchaseRequest } from "@/types/purchase-request";

// ใบฉบับร่างลบได้อย่างเดียว ใบที่เหลืออนุมัติ/ไม่อนุมัติได้ — ปุ่มคนละชุด
// จึงติ๊กปนกันไม่ได้
const groupOf = (item: PurchaseRequest) =>
  item.pr_status === PR_STATUS.DRAFT ? "draft" : "in_progress";

/**
 * การติ๊กเลือกแถวของหน้ารายการ PR พร้อมกติกาห้ามเลือกข้ามกลุ่ม —
 * ติ๊กใบคนละกลุ่มกับที่ค้างไว้จะได้ `switchTarget` มาถามก่อนสลับ ส่วนติ๊กหัวตาราง
 * ตอนยังไม่ได้เลือกอะไรจะเปิด `selectAllOpen` ให้ผู้ใช้ระบุกลุ่มเอง
 */
export function usePrSelection(items: PurchaseRequest[]) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  // ใบที่ผู้ใช้กดติ๊กทั้งที่คนละกลุ่มกับที่เลือกค้างไว้ (รอยืนยันว่าจะสลับกลุ่ม)
  const [switchTarget, setSwitchTarget] = useState<PurchaseRequest | null>(
    null,
  );
  const [selectAllOpen, setSelectAllOpen] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((item) => rowSelection[item.id]),
    [items, rowSelection],
  );
  const hasSelection = selectedItems.length > 0;
  const selectedGroup = selectedItems.length ? groupOf(selectedItems[0]) : null;
  const draftItems = items.filter((item) => groupOf(item) === "draft");
  const inProgressItems = items.filter(
    (item) => groupOf(item) === "in_progress",
  );

  const selectOnly = (list: PurchaseRequest[]) =>
    setRowSelection(Object.fromEntries(list.map((item) => [item.id, true])));

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const handleRowSelect = (item: PurchaseRequest, next: boolean) => {
    if (!next) {
      setRowSelection(({ [item.id]: _removed, ...rest }) => rest);
      return;
    }
    if (selectedGroup && selectedGroup !== groupOf(item)) {
      setSwitchTarget(item);
      return;
    }
    setRowSelection((prev) => ({ ...prev, [item.id]: true }));
  };

  const handleSelectAll = () => {
    if (hasSelection) {
      clearSelection();
      return;
    }
    setSelectAllOpen(true);
  };

  const confirmSwitch = () => {
    if (!switchTarget) return;
    setRowSelection({ [switchTarget.id]: true });
    setSwitchTarget(null);
  };

  return {
    rowSelection,
    setRowSelection,
    clearSelection,
    selectedItems,
    hasSelection,
    selectedGroup,
    draftItems,
    inProgressItems,
    selectOnly,
    handleRowSelect,
    handleSelectAll,
    switchTarget,
    setSwitchTarget,
    confirmSwitch,
    selectAllOpen,
    setSelectAllOpen,
    groupOf,
  };
}
