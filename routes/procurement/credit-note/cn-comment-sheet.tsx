
import { useProfile } from "@/hooks/use-profile";
import {
  useCreditNoteComments,
  useCreateCreditNoteComment,
  useUpdateCreditNoteComment,
  useDeleteCreditNoteComment,
} from "@/hooks/use-credit-note";
import { CommentSheet } from "@/components/ui/comment-sheet";

interface CnCommentSheetProps {
  readonly cnId: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CnCommentSheet({
  cnId,
  open,
  onOpenChange,
}: CnCommentSheetProps) {
  const { data: profile, dateFormat } = useProfile();

  const { data: comments = [], isLoading } = useCreditNoteComments(
    open ? cnId : undefined,
  );
  const createComment = useCreateCreditNoteComment();
  const updateComment = useUpdateCreditNoteComment();
  const deleteComment = useDeleteCreditNoteComment();

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
        if (!cnId) return;
        await createComment.mutateAsync({
          credit_note_id: cnId,
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
