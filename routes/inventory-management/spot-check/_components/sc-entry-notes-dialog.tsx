
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  EntryNotesDialog,
  resolveServerImageUrl,
  type SavedNotePayload,
  type ServerEvidenceImage,
} from "../../shared/entry-notes-dialog";
import {
  useSaveSpotCheckDetailComment,
  useSpotCheckDetailComments,
} from "@/hooks/use-spot-check-comments";

export type { SavedEvidenceImage, SavedNotePayload } from "../../shared/entry-notes-dialog";

interface ScEntryNotesDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly productName: string;
  readonly itemId: string;
  readonly onSaved?: (payload: SavedNotePayload) => void;
}

/**
 * Thin adapter — bind SC hooks (load comments + save comment) เข้ากับ shared EntryNotesDialog
 * UI ทั้งหมดอยู่ใน `_shared/entry-notes-dialog.tsx`
 */
export function ScEntryNotesDialog({
  open,
  onOpenChange,
  productName,
  itemId,
  onSaved,
}: ScEntryNotesDialogProps) {
  const t = useTranslations("inventoryManagement.entryDialogs");
  const { data: existingComments, isLoading: isLoadingComments } =
    useSpotCheckDetailComments(open ? itemId : undefined);
  const saveNote = useSaveSpotCheckDetailComment(itemId);

  const latest = existingComments?.[existingComments.length - 1];
  const defaultNote = latest?.message ?? "";
  const defaultServerImages: ServerEvidenceImage[] = (existingComments ?? [])
    .flatMap((c) => c.attachments)
    .filter((a) => a.contentType.startsWith("image/"))
    .map((a) => ({
      id: a.fileToken,
      url: resolveServerImageUrl(a.fileUrl, a.fileToken, a.fileName),
      name: a.fileName,
      size: a.size,
    }))
    .filter((a) => a.url);

  const formKey = `${itemId}-${existingComments?.length ?? 0}-${latest?.id ?? "empty"}-${open ? "open" : "closed"}`;

  return (
    <EntryNotesDialog
      key={formKey}
      open={open}
      onOpenChange={onOpenChange}
      productName={productName}
      defaultNote={defaultNote}
      defaultServerImages={defaultServerImages}
      isLoadingComments={isLoadingComments}
      isSaving={saveNote.isPending}
      onSave={({ note, files, previews }) => {
        saveNote.mutate(
          { message: note, type: "user", files },
          {
            onSuccess: () => {
              toast.success(t("saveNote"));
              onSaved?.({ note, images: previews });
            },
            onError: (err: Error) => {
              toast.error(err.message);
              onSaved?.({ note, images: previews });
            },
          },
        );
      }}
    />
  );
}
