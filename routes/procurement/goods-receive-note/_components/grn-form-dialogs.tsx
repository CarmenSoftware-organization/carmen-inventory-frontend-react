import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";

// แทน next/dynamic ด้วย React.lazy (code-split comment-sheet chunk เหมือนเดิม)
// lazy ต้องการ default export — wrap named export ด้วย { default: ... }
const GrnCommentSheet = lazy(() =>
  import("./grn-comment-sheet").then((mod) => ({ default: mod.GrnCommentSheet })),
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
        onOpenChange={(open) => !open && !isDeletePending && setShowDelete(false)}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { grnNo })}
        isPending={isDeletePending}
        onConfirm={onConfirmDelete}
      />

      <ConfirmDialog
        open={showCommit}
        onOpenChange={setShowCommit}
        title={t("commitTitle")}
        description={t("commitConfirm", { grnNo })}
        isPending={isCommitPending}
        confirmText={tc("commit")}
        onConfirm={onConfirmCommit}
      />

      <ConfirmDialog
        open={showVoid}
        onOpenChange={setShowVoid}
        title={t("voidTitle")}
        description={t("voidConfirm", { grnNo })}
        isPending={isVoidPending}
        confirmText={tc("void")}
        variant="destructive"
        onConfirm={onConfirmVoid}
      />

      <Suspense fallback={null}>
        <GrnCommentSheet
          grnId={goodsReceiveNote.id}
          open={showComment}
          onOpenChange={setShowComment}
        />
      </Suspense>
    </>
  );
}
