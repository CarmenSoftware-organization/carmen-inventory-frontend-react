import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CellAction } from "@/components/ui/cell-action";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { cn } from "@/lib/utils";

const EMPTY = (
  <span className="text-muted-foreground text-[0.6875rem] italic">—</span>
);

/** Vendor name (semibold) + code (muted micro) stacked in one cell */
export function VendorNameCell({
  name,
  code,
}: {
  readonly name?: string | null;
  readonly code?: string | null;
}) {
  "use no memo";
  if (!name) return EMPTY;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-foreground truncate text-xs font-semibold">
        {name}
      </span>
      {code && (
        <span className="text-muted-foreground truncate text-[0.625rem] tracking-wide uppercase">
          {code}
        </span>
      )}
    </div>
  );
}

/** Plain contact value — optional mailto/tel link, em-dash when empty */
export function ContactValue({
  value,
  href,
}: {
  readonly value?: string | null;
  readonly href?: string;
}) {
  "use no memo";
  if (!value) return EMPTY;
  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground hover:text-primary block truncate text-xs transition-colors"
      >
        {value}
      </a>
    );
  return (
    <span className="text-foreground block truncate text-xs">{value}</span>
  );
}

export function SubmissionStatusBadge({
  hasSubmitted,
  labels,
}: {
  readonly hasSubmitted: boolean;
  readonly labels: { readonly submitted: string; readonly pending: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold tracking-widest uppercase",
        hasSubmitted
          ? "bg-success/15 text-success-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {hasSubmitted ? (
        <CheckCircle2 className="size-2.5" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-70" />
      )}
      {hasSubmitted ? labels.submitted : labels.pending}
    </span>
  );
}

/** Submitted-pricelist cell — no (+ name) with an open-in-new-tab action */
export function PricelistCell({
  pricelist,
  openLabel,
}: {
  readonly pricelist: { id: string; no: string; name?: string } | null;
  readonly openLabel: string;
}) {
  "use no memo";
  if (!pricelist) return EMPTY;
  return (
    <CellAction
      title={openLabel}
      onClick={() =>
        window.open(
          `/vendor-management/price-list/${pricelist.id}`,
          "_blank",
          "noopener,noreferrer",
        )
      }
      className="truncate text-[0.6875rem]"
    >
      {pricelist.no}
    </CellAction>
  );
}

/** Row actions — copy/open the vendor URL + remove (with confirm) */
export function VendorActionsCell({
  urlToken,
  isDisabled,
  onRemove,
  labels,
}: {
  readonly urlToken?: string;
  readonly isDisabled: boolean;
  readonly onRemove: () => void;
  readonly labels: {
    readonly copyUrl: string;
    readonly openUrl: string;
    readonly removeVendor: string;
    readonly confirmDesc: string;
  };
}) {
  "use no memo";
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleCopyUrl = () => {
    if (!urlToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/pl/${urlToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUrl = () => {
    if (!urlToken) return;
    window.open(`/pl/${urlToken}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center justify-end gap-0.5">
      {urlToken && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCopyUrl}
            title={labels.copyUrl}
            aria-label={labels.copyUrl}
            className="text-muted-foreground hover:text-foreground rounded-lg"
          >
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleOpenUrl}
            title={labels.openUrl}
            aria-label={labels.openUrl}
            className="text-muted-foreground hover:text-foreground rounded-lg"
          >
            <ExternalLink />
          </Button>
        </>
      )}
      {!isDisabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={labels.removeVendor}
          onClick={() => setShowDelete(true)}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
        >
          <Trash2 />
        </Button>
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={labels.removeVendor}
        description={labels.confirmDesc}
        onConfirm={() => {
          onRemove();
          setShowDelete(false);
        }}
      />
    </div>
  );
}
