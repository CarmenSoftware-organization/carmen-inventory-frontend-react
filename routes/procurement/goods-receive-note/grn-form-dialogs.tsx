import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { Ban, Check } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  PeriodDateChoice,
  type PeriodDateChoice as PeriodDateChoiceValue,
} from "@/components/share/period-date-choice";
import { grnCommentCrud } from "@/hooks/use-goods-receive-note";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";

// แทน next/dynamic ด้วย React.lazy (code-split comment-sheet chunk เหมือนเดิม)
// lazy ต้องการ default export — wrap named export ด้วย { default: ... }
const EntityCommentSheet = lazy(() =>
  import("@/components/share/entity-comment-sheet").then((mod) => ({
    default: mod.EntityCommentSheet,
  })),
);

interface GrnFormDialogsProps {
  goodsReceiveNote: GoodsReceiveNote;
  showDelete: boolean;
  setShowDelete: (open: boolean) => void;
  isDeletePending: boolean;
  onConfirmDelete: () => void;
  showCommit: boolean;
  setShowCommit: (open: boolean) => void;
  isCommitPending: boolean;
  onConfirmCommit: () => void;
  /** ใบร่างเท่านั้นที่ยังเลือกวันที่ได้ — saved ลงสต๊อกไปตั้งแต่ /save แล้ว */
  isDraft: boolean;
  grnDate?: string;
  periodDateChoice: PeriodDateChoiceValue;
  onPeriodDateChoiceChange: (value: PeriodDateChoiceValue) => void;
  showVoid: boolean;
  setShowVoid: (open: boolean) => void;
  isVoidPending: boolean;
  onConfirmVoid: () => void;
  showComment: boolean;
  setShowComment: (open: boolean) => void;
}

export function GrnFormDialogs({
  goodsReceiveNote,
  showDelete,
  setShowDelete,
  isDeletePending,
  onConfirmDelete,
  showCommit,
  setShowCommit,
  isCommitPending,
  onConfirmCommit,
  isDraft,
  grnDate,
  periodDateChoice,
  onPeriodDateChoiceChange,
  showVoid,
  setShowVoid,
  isVoidPending,
  onConfirmVoid,
  showComment,
  setShowComment,
}: GrnFormDialogsProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const grnNo = goodsReceiveNote.grn_no ?? "";

  return (
    <>
      <DeleteDialog
        open={showDelete}
        onOpenChange={(open) =>
          !open && !isDeletePending && setShowDelete(false)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { grnNo })}
        isPending={isDeletePending}
        onConfirm={onConfirmDelete}
      />

      <ConfirmDialog
        open={showCommit}
        onOpenChange={setShowCommit}
        title={t("commitTitle")}
        // commit ของใบร่างจะลงสต๊อกตามวันที่บนใบ — ถ้าวันนั้นอยู่นอกงวดที่เปิด
        // ต้องถามก่อนว่าจะย้ายเข้างวดหรือคงวันเดิม (ใบที่ saved แล้วลงสต๊อกไป
        // ตั้งแต่ /save จึงไม่ต้องถาม เปลี่ยนวันตอนนี้ก็ไม่มีความหมาย)
        description={
          <>
            {t("commitConfirm", { grnNo })}
            {isDraft && (
              <PeriodDateChoice
                docDate={grnDate}
                value={periodDateChoice}
                onChange={onPeriodDateChoiceChange}
              />
            )}
          </>
        }
        isPending={isCommitPending}
        confirmText={t("commit")}
        confirmIcon={<Check />}
        onConfirm={onConfirmCommit}
      />

      <ConfirmDialog
        open={showVoid}
        onOpenChange={setShowVoid}
        title={t("voidTitle")}
        description={t("voidConfirm", { grnNo })}
        isPending={isVoidPending}
        confirmText={tc("void")}
        confirmIcon={<Ban />}
        variant="destructive"
        onConfirm={onConfirmVoid}
      />

      <Suspense fallback={null}>
        <EntityCommentSheet
          crud={grnCommentCrud}
          entityId={goodsReceiveNote.id}
          open={showComment}
          onOpenChange={setShowComment}
        />
      </Suspense>
    </>
  );
}
