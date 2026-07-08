import { Receipt } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSpotCheckMethodLabel } from "@/constant/spot-check-method";
import { METHOD_VISUAL, STATUS_VISUAL } from "./sc-status-visual";
import type { SpotCheckMethod, SpotCheckStatus } from "@/types/spot-check";

interface ScDocStatusRowProps {
  readonly docNo: string;
  readonly docStatus: SpotCheckStatus;
  readonly method: SpotCheckMethod;
  /** sm = location-card resume panel header, md = history-card top header */
  readonly size?: "sm" | "md";
}

export function ScDocStatusRow({
  docNo,
  docStatus,
  method,
  size = "md",
}: ScDocStatusRowProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const ts = useTranslations("status");

  const status = STATUS_VISUAL[docStatus] ?? STATUS_VISUAL.pending;
  const methodVis = METHOD_VISUAL[method] ?? METHOD_VISUAL.random;
  const MethodIcon = methodVis.icon;
  const methodLabel = getSpotCheckMethodLabel(t, method);

  const isSm = size === "sm";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Receipt
          className={cn(
            "text-primary/80 shrink-0",
            isSm ? "size-3" : "size-3.5",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-foreground truncate font-semibold tracking-wider",
            isSm ? "text-[0.75rem]" : "text-sm",
          )}
        >
          {docNo}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge
          variant={status.variant}
          size="xs"
          className={cn(
            "gap-1 px-2 text-[0.5625rem] font-semibold tracking-wider uppercase",
            status.className,
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              status.dotClass,
              status.pulse && "animate-pulse",
            )}
            aria-hidden="true"
          />
          {ts(docStatus)}
        </Badge>
        <Badge
          variant={methodVis.variant}
          size="xs"
          className="gap-1 px-2 text-[0.5625rem] font-semibold tracking-wider uppercase"
        >
          <MethodIcon className="size-2.5" aria-hidden="true" />
          {methodLabel}
        </Badge>
      </div>
    </div>
  );
}
