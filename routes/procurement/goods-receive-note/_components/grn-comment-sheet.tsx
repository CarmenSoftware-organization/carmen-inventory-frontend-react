
import { useProfile } from "@/hooks/use-profile";
import {
  useGoodsReceiveNoteComments,
  useCreateGrnComment,
  useUpdateGrnComment,
  useDeleteGrnComment,
} from "@/hooks/use-goods-receive-note";
import { CommentSheet } from "@/components/ui/comment-sheet";

interface GrnCommentSheetProps {
  readonly grnId: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function GrnCommentSheet({
  grnId,
  open,
  onOpenChange,
}: GrnCommentSheetProps) {
  const { data: profile, dateFormat } = useProfile();

  const { data: comments = [], isLoading } = useGoodsReceiveNoteComments(
    open ? grnId : undefined,
  );
  const createComment = useCreateGrnComment();
  const updateComment = useUpdateGrnComment();
  const deleteComment = useDeleteGrnComment();

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
        if (!grnId) return;
        await createComment.mutateAsync({
          good_received_note_id: grnId,
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
