
import { useProfile } from "@/hooks/use-profile";
import {
  usePurchaseOrderComments,
  useCreatePurchaseOrderComment,
  useUpdatePurchaseOrderComment,
  useDeletePurchaseOrderComment,
} from "@/hooks/use-purchase-order";
import { CommentSheet } from "@/components/ui/comment-sheet";

interface PoCommentSheetProps {
  readonly poId: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function PoCommentSheet({
  poId,
  open,
  onOpenChange,
}: PoCommentSheetProps) {
  const { data: profile, dateFormat } = useProfile();

  const { data: comments = [], isLoading } = usePurchaseOrderComments(
    open ? poId : undefined,
  );
  const createComment = useCreatePurchaseOrderComment();
  const updateComment = useUpdatePurchaseOrderComment();
  const deleteComment = useDeletePurchaseOrderComment();

  return (
    <CommentSheet
      open={open}
      onOpenChange={onOpenChange}
      comments={comments}
      isLoading={isLoading}
      currentUserId={profile?.id}
      dateFormat={dateFormat}
      directFileUpload
      onSubmit={async (data) => {
        await createComment.mutateAsync({
          purchase_order_id: poId!,
          message: data.message,
          type: "user",
          files: data.files,
        });
      }}
      isSubmitting={createComment.isPending}
      onUpdate={async (data) => {
        await updateComment.mutateAsync({
          id: data.id,
          message: data.message,
          attachments: data.attachments,
        });
      }}
      isUpdating={updateComment.isPending}
      onDelete={async (id) => {
        await deleteComment.mutateAsync(id);
      }}
      isDeleting={deleteComment.isPending}
    />
  );
}
