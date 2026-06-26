
import { useState } from "react";
import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ErrorStateProps {
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly errorId?: string;
}

export function ErrorState({ message, onRetry, errorId }: ErrorStateProps) {
  const t = useTranslations("errors");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!errorId) return;
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      toast.success(t("errorIdCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard อาจถูกบล็อก — ไม่ทำอะไร
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertCircle aria-hidden="true" className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-semibold">{t("title")}</p>
        <p className="text-muted-foreground max-w-md text-xs">
          {message ?? t("unexpected")}
        </p>
      </div>

      {errorId && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t("copyErrorId")}
          className="border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.6875rem] transition-colors"
        >
          <span className="font-semibold tracking-widest uppercase">
            {t("errorId")}
          </span>
          <span>·</span>
          <span>{errorId}</span>
          {copied ? (
            <Check className="text-success size-3" aria-hidden="true" />
          ) : (
            <Copy className="size-3" aria-hidden="true" />
          )}
        </button>
      )}

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 size-3" aria-hidden="true" />
          {t("tryAgain")}
        </Button>
      )}
    </div>
  );
}
