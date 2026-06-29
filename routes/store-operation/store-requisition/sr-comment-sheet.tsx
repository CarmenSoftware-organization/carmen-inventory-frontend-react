
import { useProfile } from "@/hooks/use-profile";
import {
  useStoreRequisitionComments,
  useCreateStoreRequisitionComment,
  useUpdateStoreRequisitionComment,
  useDeleteStoreRequisitionComment,
} from "@/hooks/use-store-requisition";
import { CommentSheet } from "@/components/ui/comment-sheet";

interface SrCommentSheetProps {
  readonly srId: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function SrCommentSheet({
  srId,
  open,
  onOpenChange,
}: SrCommentSheetProps) {
  const { data: profile, dateFormat } = useProfile();

  const { data: comments = [], isLoading } = useStoreRequisitionComments(
    open ? srId : undefined,
  );
  const createComment = useCreateStoreRequisitionComment();
  const updateComment = useUpdateStoreRequisitionComment();
  const deleteComment = useDeleteStoreRequisitionComment();

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
        if (!srId) return;
        await createComment.mutateAsync({
          store_requisition_id: srId,
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
