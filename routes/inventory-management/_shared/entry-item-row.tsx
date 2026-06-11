
import { memo, useState, type ComponentType } from "react";
import { Calculator, ImageIcon, MessageSquarePlus, Pencil } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductAvatar } from "./inv-shared";
import type { SavedNotePayload } from "./entry-notes-dialog";
interface NotesDialogComponentProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly productName: string;
  readonly itemId: string;
  readonly onSaved?: (payload: SavedNotePayload) => void;
}
export interface EntryItemRowProps {
  readonly id: string;
  readonly index: number;
  readonly productId: string;
  readonly productName: string;
  readonly productSku: string;
  readonly inventoryUnitName: string;
  readonly committedQty: number | null;
  readonly isCounted: boolean;
  readonly onCommit: (id: string, value: number | null) => void;
  readonly onOpenCalc: (item: {
    id: string;
    productId: string;
    name: string;
    unit: string;
  }) => void;
  readonly sequenceNo?: number;
  readonly productCode?: string;
  readonly productLocalName?: string;
  readonly commitOnChange?: boolean;
  readonly NotesDialog: ComponentType<NotesDialogComponentProps>;
  readonly translationNamespace: string;
}

export const EntryItemRow = memo(function EntryItemRow({
  id,
  index,
  productId,
  productName,
  productSku,
  inventoryUnitName,
  committedQty,
  isCounted,
  onCommit,
  onOpenCalc,
  sequenceNo,
  productCode,
  productLocalName,
  commitOnChange = false,
  NotesDialog,
  translationNamespace,
}: EntryItemRowProps) {
  const t = useTranslations(translationNamespace);
  const [isFocused, setIsFocused] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [savedNote, setSavedNote] = useState<SavedNotePayload | null>(null);
  const [draft, setDraft] = useState<string>(
    committedQty == null ? "" : String(committedQty),
  );
  // Sync draft จาก parent เฉพาะตอนไม่ได้ focus เพื่อไม่กวนการพิมพ์
  const [lastCommitted, setLastCommitted] = useState(committedQty);
  if (committedQty !== lastCommitted) {
    setLastCommitted(committedQty);
    if (!isFocused) {
      setDraft(committedQty == null ? "" : String(committedQty));
    }
  }

  const parseValue = (raw: string): number | null =>
    raw === "" ? null : Math.max(0, Number.parseFloat(raw) || 0);

  const commit = () => {
    const value = parseValue(draft);
    if (value !== committedQty) onCommit(id, value);
  };

  const detailedHeader = sequenceNo !== undefined;
  const showLocalName =
    productLocalName && productLocalName !== productName
      ? productLocalName
      : null;
  const showSkuLine = detailedHeader
    ? productSku && productSku !== productCode
    : true;

  return (
    <div className="border-border/60 bg-card/70 hover:border-primary/40 relative space-y-2.5 rounded-xl border p-3 transition-colors">
      <div className="flex items-start gap-2.5">
        <ProductAvatar
          letter={productName?.[0]?.toUpperCase() ?? "?"}
          index={index}
        />

        <div className="min-w-0 flex-1 space-y-0.5">
          {detailedHeader ? (
            <>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-muted-foreground/80 text-[0.625rem] font-bold tabular-nums">
                  #{String(sequenceNo).padStart(2, "0")}
                </span>
                <h3 className="text-foreground text-sm leading-tight font-semibold tracking-tight">
                  {productName}
                </h3>
                {productCode && (
                  <span className="text-muted-foreground text-[0.625rem] tracking-wide uppercase">
                    {productCode}
                  </span>
                )}
              </div>
              {showLocalName && (
                <p className="text-muted-foreground text-[0.6875rem] leading-snug">
                  {showLocalName}
                </p>
              )}
              {showSkuLine && (
                <p className="text-muted-foreground/80 text-[0.625rem] tracking-wide uppercase">
                  {t("sku", { code: productSku })}
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-foreground text-sm leading-tight font-semibold tracking-tight">
                {productName}
              </h3>
              <p className="text-muted-foreground text-[0.625rem] tracking-wide uppercase">
                {t("sku", { code: productSku })}
              </p>
            </>
          )}
        </div>

        {isCounted && (
          <Badge
            variant="success"
            size="xs"
            className="text-[0.5625rem] tracking-widest uppercase"
          >
            {t("counted")}
          </Badge>
        )}
      </div>

      <div className="border-border/40 flex items-center gap-2 border-t pt-2.5">
        <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
          {t("actualCount")}
        </span>
        <div className="ml-auto flex">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              commit();
            }}
            onChange={(e) => {
              const newDraft = e.target.value;
              setDraft(newDraft);
              if (commitOnChange) {
                const value = parseValue(newDraft);
                if (value !== committedQty) onCommit(id, value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="border-border/40 focus-visible:border-primary bg-card/40 h-8 w-32 rounded-l-lg rounded-r-none border pr-2 text-right text-sm tabular-nums shadow-none backdrop-blur-sm focus-visible:ring-0"
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="border-border/40 hover:bg-card/80 bg-card/40 h-8 w-8 rounded-l-none border border-l-0 backdrop-blur-sm"
            onClick={() =>
              onOpenCalc({
                id,
                productId,
                name: productName,
                unit: inventoryUnitName,
              })
            }
            aria-label={t("calculator")}
          >
            <Calculator className="size-3.5" />
          </Button>
        </div>
        {inventoryUnitName && (
          <span className="text-muted-foreground text-[0.6875rem]">
            {inventoryUnitName}
          </span>
        )}
      </div>

      <button
        type="button"
        className="text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-1 text-[0.6875rem] font-medium transition-colors"
        onClick={() => setNotesOpen(true)}
      >
        <MessageSquarePlus className="size-2.5" aria-hidden="true" />
        {t("addNotes")}
      </button>

      {/* Saved note preview */}
      {savedNote &&
        (savedNote.note.length > 0 || savedNote.images.length > 0) && (
          <div className="border-primary/30 bg-primary/5 relative space-y-1.5 rounded-lg border border-dashed p-2">
            {savedNote.note.length > 0 && (
              <p className="text-foreground/80 text-[0.6875rem] leading-relaxed whitespace-pre-wrap">
                {savedNote.note}
              </p>
            )}
            {savedNote.images.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {savedNote.images.slice(0, 4).map((img) => (
                  <div
                    key={img.id}
                    className="border-border/60 relative size-10 overflow-hidden rounded-md border shadow-sm"
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                ))}
                {savedNote.images.length > 4 && (
                  <div className="border-border/60 bg-muted/60 text-muted-foreground flex size-10 items-center justify-center rounded-md border text-[0.625rem] font-bold tabular-nums">
                    +{savedNote.images.length - 4}
                  </div>
                )}
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[0.5625rem] font-semibold tracking-widest uppercase">
                  <ImageIcon className="size-2.5" aria-hidden="true" />
                  {t("evidenceCount", { count: savedNote.images.length })}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setNotesOpen(true)}
              aria-label={t("addNotes")}
              className="text-muted-foreground hover:text-primary absolute top-1 right-1 size-5 rounded-full"
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        )}

      <NotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        productName={productName}
        itemId={id}
        onSaved={(payload) => setSavedNote(payload)}
      />
    </div>
  );
});
