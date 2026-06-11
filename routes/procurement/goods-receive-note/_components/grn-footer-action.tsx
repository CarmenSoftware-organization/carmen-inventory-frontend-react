import { useTranslations } from "use-intl";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GrnFooterActionProps {
  readonly isActionPending: boolean;
  readonly hasRecord: boolean;
  readonly isView: boolean;
  readonly isCommitted: boolean;
  readonly isVoid: boolean;
  readonly onCommit?: () => void;
  readonly onVoid?: () => void;
}

export function GrnFooterAction({
  isActionPending,
  hasRecord,
  isView,
  isCommitted,
  isVoid,
  onCommit,
  onVoid,
}: GrnFooterActionProps) {
  const tc = useTranslations("common");

  const showActions = hasRecord && isView && !isCommitted && !isVoid;

  if (!showActions) return null;

  return (
    <div className="bg-background sticky bottom-0 z-20 mt-auto flex items-center justify-end gap-2 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <Button
        type="button"
        variant="success"
        size="sm"
        disabled={isActionPending}
        onClick={() => onCommit?.()}
      >
        <Check aria-hidden="true" />
        {tc("commit")}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isActionPending}
        onClick={() => onVoid?.()}
      >
        <X aria-hidden="true" />
        {tc("void")}
      </Button>
    </div>
  );
}
