
import { useTranslations } from "use-intl";
import { Check, Eye, PackageCheck, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_ROLE } from "@/types/stage-role";

type SrAction = "none" | "review" | "rejected" | "approved";

interface SrFooterProps {
  readonly canSubmit: boolean;
  readonly isPending: boolean;
  readonly role?: string;
  readonly action: SrAction;
  readonly onSubmit: () => void;
  readonly onApprove: () => void;
  readonly onIssue: () => void;
  readonly onReject: () => void;
  readonly onSendBack: () => void;
}

export function SrFooter({
  canSubmit,
  isPending,
  role,
  action,
  onSubmit,
  onApprove,
  onIssue,
  onReject,
  onSendBack,
}: SrFooterProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");

  const isApprover = role === STAGE_ROLE.APPROVE;
  const isIssuer = role === STAGE_ROLE.ISSUE;
  const isWorkflowReviewer = isApprover || isIssuer;
  const hasAction = action !== "none";
  const showFooter = canSubmit || (isWorkflowReviewer && hasAction);

  if (!showFooter) return null;

  return (
    <div className="bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center justify-end gap-3 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-nowrap sm:gap-4">
      {isWorkflowReviewer && action === "review" && (
        <Button
          type="button"
          size="sm"
          variant="warning"
          disabled={isPending}
          onClick={onSendBack}
        >
          <Eye />
          {tc("sendBack")}
        </Button>
      )}
      {isWorkflowReviewer && action === "rejected" && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={onReject}
        >
          <X />
          {tc("reject")}
        </Button>
      )}
      {isApprover && action === "approved" && (
        <Button
          type="button"
          size="sm"
          variant="success"
          disabled={isPending}
          onClick={onApprove}
        >
          <Check />
          {tc("approve")}
        </Button>
      )}
      {isIssuer && action === "approved" && (
        <Button
          type="button"
          size="sm"
          variant="success"
          disabled={isPending}
          onClick={onIssue}
        >
          <PackageCheck />
          {tc("issue")}
        </Button>
      )}
      {!isWorkflowReviewer && (
        <Button
          type="button"
          size="sm"
          variant="info"
          disabled={isPending}
          onClick={onSubmit}
        >
          <Send />
          {t("submit")}
        </Button>
      )}
    </div>
  );
}
