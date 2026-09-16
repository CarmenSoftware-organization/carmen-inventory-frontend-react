import { useTranslations } from "use-intl";
import { useGoodsReceiveNoteById } from "@/hooks/use-goods-receive-note";
import { GrnForm } from "./grn-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function GrnEditContent({ id }: { id: string }) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const {
    data: goodsReceiveNote,
    isLoading,
    error,
    refetch,
  } = useGoodsReceiveNoteById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !goodsReceiveNote)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/procurement/goods-receive-note"
      />
    );

  return (
    <GrnForm key={goodsReceiveNote.id} goodsReceiveNote={goodsReceiveNote} />
  );
}
