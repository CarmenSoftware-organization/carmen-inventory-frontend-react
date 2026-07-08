
import { useState, type Dispatch, type SetStateAction } from "react";

export interface PoDialogState {
  showDelete: boolean;
  showComment: boolean;
  showReject: boolean;
  showClose: boolean;
  showHistory: boolean;
  setShowDelete: Dispatch<SetStateAction<boolean>>;
  setShowComment: Dispatch<SetStateAction<boolean>>;
  setShowReject: Dispatch<SetStateAction<boolean>>;
  setShowClose: Dispatch<SetStateAction<boolean>>;
  setShowHistory: Dispatch<SetStateAction<boolean>>;
}

/**
 * Hook รวมสถานะของ dialog ที่ใช้ในฟอร์ม PO
 * รวม 4 dialog: delete, comment, reject, close
 * ช่วยให้ PoForm ไม่ต้องประกาศ useState ทีละตัว
 *
 * @returns ออบเจ็กต์ state + setter ของแต่ละ dialog
 * @example
 * const { showDelete, setShowDelete, showComment, setShowComment } = usePoDialogState();
 * <DeleteDialog open={showDelete} onOpenChange={setShowDelete} />
 */
export function usePoDialogState(): PoDialogState {
  const [showDelete, setShowDelete] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return {
    showDelete,
    setShowDelete,
    showComment,
    setShowComment,
    showReject,
    setShowReject,
    showClose,
    setShowClose,
    showHistory,
    setShowHistory,
  };
}
