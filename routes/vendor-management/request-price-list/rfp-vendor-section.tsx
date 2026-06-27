
import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { cn } from "@/lib/utils";
import type { Vendor } from "@/types/vendor";
import type { RequestPriceListVendor } from "@/types/request-price-list";
import { EmptyProducts } from "../price-list/pl-empty-states";
import type { RfpFormValues } from "./rfp-form-schema";

type VendorAddItem = RfpFormValues["vendors"]["add"][number];
type DisplayVendor = RequestPriceListVendor | VendorAddItem;

interface RfpVendorSectionProps {
  readonly isDisabled: boolean;
  readonly isAdding: boolean;
  readonly setIsAdding: (v: boolean) => void;
  readonly displayVendors: DisplayVendor[];
  readonly selectedVendorIds: Set<string>;
  readonly onAddVendor: (vendor: Vendor) => void;
  readonly onRemoveVendor: (vendorId: string) => void;
}

/** Vendor section — Soft Sheet card list (mirrors PltProductCard pattern) */
export default function RfpVendorSection({
  isDisabled,
  isAdding,
  setIsAdding,
  displayVendors,
  selectedVendorIds,
  onAddVendor,
  onRemoveVendor,
}: RfpVendorSectionProps) {
  const t = useTranslations("vendorManagement.requestPriceList");

  const handleAddClick = () => {
    if (isAdding) return;
    setIsAdding(true);
  };

  const submittedCount = displayVendors.filter(
    (v) => "has_submitted" in v && v.has_submitted,
  ).length;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <h3 className="text-foreground text-sm font-semibold tracking-tight">
            {t("vendors.title")}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
            {displayVendors.length === 0
              ? t("vendors.noVendors")
              : `${displayVendors.length} ${t("vendorsLabel")} · ${submittedCount} ${t("submittedLabel")}`}
          </p>
        </div>
        {!isDisabled && (
          <Button
            type="button"
            size="xs"
            onClick={handleAddClick}
            disabled={isAdding}
            className="rounded-full"
          >
            <Plus />
            {t("vendors.addVendor")}
          </Button>
        )}
      </div>

      {displayVendors.length === 0 && !isAdding ? (
        <EmptyProducts
          onAdd={handleAddClick}
          disabled={isDisabled}
          title={t("vendors.noVendors")}
          description={t("vendors.noVendorsDesc")}
          addLabel={t("vendors.addVendor")}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {displayVendors.map((vendor, idx) => (
            <VendorCard
              key={`${vendor.vendor_id}-${idx}`}
              vendor={vendor}
              index={idx}
              isDisabled={isDisabled}
              onRemove={() => onRemoveVendor(vendor.vendor_id)}
            />
          ))}
          {isAdding && (
            <NewVendorRow
              selectedVendorIds={selectedVendorIds}
              onCancel={() => setIsAdding(false)}
              onAddVendor={onAddVendor}
              index={displayVendors.length}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── VendorCard ─────────────────────────────────────────────── */

function VendorCard({
  vendor,
  index,
  isDisabled,
  onRemove,
}: {
  readonly vendor: DisplayVendor;
  readonly index: number;
  readonly isDisabled: boolean;
  readonly onRemove: () => void;
}) {
  const t = useTranslations("vendorManagement.requestPriceList");
  const td = useTranslations("delete");
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const isExisting = "url_token" in vendor;
  const existingVendor = isExisting ? (vendor as RequestPriceListVendor) : null;
  const hasSubmitted = existingVendor?.has_submitted ?? false;
  const urlToken = existingVendor?.url_token ?? "";
  const submittedPricelist = existingVendor?.pricelist ?? null;

  const contactPerson = vendor.contact_person;
  const contactPhone = vendor.contact_phone;
  const contactEmail = vendor.contact_email;

  const handleCopyUrl = () => {
    if (!urlToken) return;
    const url = `${globalThis.window.location.origin}/pl/${urlToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUrl = () => {
    if (!urlToken) return;
    window.open(`/pl/${urlToken}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="border-border/60 bg-card hover:border-primary/40 relative rounded-xl border p-3 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar with sequence badge */}
        <div className="relative shrink-0">
          <VendorAvatar name={vendor.vendor_name} />
          <div className="bg-foreground text-background absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-semibold">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>

        {/* Vendor info */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-foreground truncate text-sm font-semibold tracking-tight">
            {vendor.vendor_name || "—"}
          </div>
          <div className="text-muted-foreground truncate text-[0.625rem] tracking-wide uppercase">
            {vendor.vendor_code || "—"}
          </div>
        </div>

        {/* Status badge */}
        {isExisting && (
          <SubmissionStatusBadge
            hasSubmitted={hasSubmitted}
            labels={{
              submitted: t("statusSubmitted"),
              pending: t("statusPending"),
            }}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {urlToken && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyUrl}
                title={t("vendors.copyUrl")}
                aria-label={t("vendors.copyUrl")}
                className="text-muted-foreground hover:text-foreground rounded-lg"
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleOpenUrl}
                title={t("vendors.openUrl")}
                aria-label={t("vendors.openUrl")}
                className="text-muted-foreground hover:text-foreground rounded-lg"
              >
                <ExternalLink />
              </Button>
            </>
          )}
          {!isDisabled && (
            <Button
              type="button"
              size="icon-xs"
              aria-label={t("vendors.removeVendor")}
              onClick={() => setShowDelete(true)}
              className="bg-primary/10 text-muted-foreground hover:text-destructive hover:bg-primary/20 rounded-lg"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {/* Contact details row — read-only text (auto-filled from primary contact) */}
      <div className="border-border/60 mt-3 grid grid-cols-1 gap-2 border-t pt-3 md:grid-cols-3">
        <ContactCell icon={User} value={contactPerson || "—"} />
        <ContactCell icon={Phone} value={contactPhone || "—"} />
        <ContactCell
          icon={Mail}
          value={contactEmail || "—"}
          href={contactEmail ? `mailto:${contactEmail}` : undefined}
        />
      </div>

      {/* Submitted pricelist info */}
      {submittedPricelist && (
        <div className="border-border/60 bg-primary/5 mt-2 flex items-center justify-between gap-2 rounded-lg border border-dashed px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <FileText className="text-primary size-3 shrink-0" />
            <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-widest uppercase">
              {t("submittedPricelist")}
            </span>
            <span className="text-foreground/80 truncate text-[0.6875rem] font-semibold">
              {submittedPricelist.no}
            </span>
            {submittedPricelist.name && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-foreground/80 truncate text-[0.6875rem]">
                  {submittedPricelist.name}
                </span>
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("viewPricelist")}
            onClick={() =>
              window.open(
                `/vendor-management/price-list/${submittedPricelist.id}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="text-muted-foreground hover:text-primary rounded-md"
          >
            <ExternalLink />
          </Button>
        </div>
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={t("vendors.removeVendor")}
        description={td("confirmNamed", { name: vendor.vendor_name })}
        onConfirm={() => {
          onRemove();
          setShowDelete(false);
        }}
      />
    </div>
  );
}

/* ── NewVendorRow — placeholder card while adding ──────────── */

function NewVendorRow({
  selectedVendorIds,
  onCancel,
  onAddVendor,
  index,
}: {
  readonly selectedVendorIds: Set<string>;
  readonly onCancel: () => void;
  readonly onAddVendor: (vendor: Vendor) => void;
  readonly index: number;
}) {
  const t = useTranslations("vendorManagement.requestPriceList");
  const tc = useTranslations("common");

  return (
    <div className="border-primary/40 bg-primary/5 relative rounded-xl border border-dashed p-3">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="border-primary/40 bg-card/60 flex size-9 items-center justify-center rounded-lg border border-dashed"
            aria-hidden
          >
            <Plus className="text-primary size-4" />
          </div>
          <div className="bg-foreground text-background absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-semibold">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <LookupVendor
            value=""
            defaultLabel={undefined}
            disabled={false}
            onValueChange={() => {}}
            onItemChange={(vendor) => onAddVendor(vendor)}
            excludeIds={selectedVendorIds}
            placeholder={t("vendors.selectVendorToAdd")}
            className="h-7 w-full text-xs"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={tc("cancel")}
          onClick={onCancel}
          className="text-muted-foreground hover:text-destructive rounded-lg"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

/* ── helpers ────────────────────────────────────────────────── */

function VendorAvatar({ name }: { readonly name: string }) {
  const letter = (name?.trim()[0] || "?").toUpperCase();
  return (
    <div className="text-primary-foreground flex size-9 items-center justify-center rounded-lg bg-primary font-serif text-base font-semibold">
      {letter}
    </div>
  );
}

function SubmissionStatusBadge({
  hasSubmitted,
  labels,
}: {
  readonly hasSubmitted: boolean;
  readonly labels: { readonly submitted: string; readonly pending: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase",
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

function ContactCell({
  icon: Icon,
  value,
  href,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly value: string;
  readonly href?: string;
}) {
  const className =
    "flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-muted-foreground";
  const content = (
    <>
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{value}</span>
    </>
  );
  if (href && value !== "—") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className, "hover:text-primary transition-colors")}
      >
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}
