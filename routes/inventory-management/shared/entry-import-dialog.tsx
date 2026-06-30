import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ImportApplyPayload {
  matched: number;
  total: number;
  skipped: number;
  updates: Record<string, number | null>;
}

export interface ImportItemRef {
  id: string;
  product_sku: string;
}

interface EntryImportDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly items: readonly ImportItemRef[];
  readonly onApply: (payload: ImportApplyPayload) => void;
}

const REQUIRED_COLUMNS = [
  "id",
  "product_code",
  "product_name",
  "product_local_name",
  "product_sku",
  "inventory_unit_name",
  "actual_qty",
] as const;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface ParseResult {
  matched: number;
  total: number;
  skipped: number;
  updates: Record<string, number | null>;
  missing: string[];
}

const cellAsString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

export function EntryImportDialog({
  open,
  onOpenChange,
  items,
  onApply,
}: EntryImportDialogProps) {
  const t = useTranslations("inventoryManagement.entryDialogs");
  const tc = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeDialog = (next: boolean) => {
    if (!next) {
      setFile(null);
      setResult(null);
      setIsDragging(false);
      setIsParsing(false);
    }
    onOpenChange(next);
  };

  const parseFile = async (f: File) => {
    setIsParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        toast.error(t("importEmptyFile"));
        setResult(null);
        return;
      }
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      if (json.length === 0) {
        toast.error(t("importEmptyFile"));
        setResult(null);
        return;
      }

      const headerKeys = Object.keys(json[0]);
      const missing = REQUIRED_COLUMNS.filter((c) => !headerKeys.includes(c));
      if (missing.length > 0) {
        setResult({
          matched: 0,
          total: json.length,
          skipped: json.length,
          updates: {},
          missing,
        });
        return;
      }

      const idSet = new Set<string>();
      const skuToId = new Map<string, string>();
      for (const it of items) {
        idSet.add(it.id);
        skuToId.set(String(it.product_sku), it.id);
      }

      const updates: Record<string, number | null> = {};
      let matched = 0;
      let skipped = 0;
      for (const row of json) {
        const rawId = cellAsString(row.id);
        const rawSku = cellAsString(row.product_sku);
        let targetId: string | undefined;
        if (rawId && idSet.has(rawId)) {
          targetId = rawId;
        } else if (rawSku) {
          targetId = skuToId.get(rawSku);
        }
        if (!targetId) {
          skipped += 1;
          continue;
        }
        const raw = row.actual_qty;
        const value =
          raw === "" || raw == null ? null : Math.max(0, Number(raw) || 0);
        updates[targetId] = value;
        matched += 1;
      }

      setResult({
        matched,
        total: json.length,
        skipped,
        updates,
        missing: [],
      });
    } catch {
      toast.error(t("importInvalidFile"));
      setResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const acceptFile = (f: File) => {
    setFile(f);
    setResult(null);
    void parseFile(f);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) acceptFile(f);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    setFile(null);
    setResult(null);
  };

  const canApply =
    result !== null && result.missing.length === 0 && result.matched > 0;

  const handleApply = () => {
    if (!canApply || !result) return;
    onApply({
      matched: result.matched,
      total: result.total,
      skipped: result.skipped,
      updates: result.updates,
    });
    closeDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-md">
        <div className="p-5">
          <DialogHeader className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Upload className="size-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <DialogTitle className="text-foreground text-base leading-tight font-semibold tracking-tight">
                  {t("importDialogEyebrow")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-[0.6875rem] leading-relaxed">
                  {t("importDialogDesc")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
            aria-label={t("importChooseFile")}
          />

          {file ? (
            <div className="border-border/60 bg-card relative flex items-start gap-3 rounded-xl border p-3">
              <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-foreground truncate text-xs font-semibold">
                  {file.name}
                </div>
                <div className="text-muted-foreground text-[0.625rem] tabular-nums">
                  {formatBytes(file.size)}
                  {isParsing && <span className="ml-1.5">· parsing…</span>}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={removeFile}
                aria-label={t("removeFile")}
                className="text-muted-foreground hover:text-destructive shrink-0 rounded-full"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              aria-label={t("importDropHint")}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 transition-colors",
                isDragging
                  ? "border-primary bg-primary/15"
                  : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10",
              )}
            >
              <div className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-2xl">
                <FileSpreadsheet className="size-6" aria-hidden="true" />
              </div>
              <span className="text-foreground/90 text-xs font-semibold">
                {t("importDropHint")}
              </span>
              <span className="text-muted-foreground text-[0.625rem] tracking-wide uppercase">
                {t("importFormatsHint")}
              </span>
            </button>
          )}

          {result && result.missing.length > 0 && (
            <div className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-xl border p-2">
              <AlertCircle
                className="text-destructive mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-destructive text-[0.6875rem] font-semibold">
                  {t("importColumnsMissing", {
                    columns: result.missing.join(", "),
                  })}
                </div>
                <div className="text-muted-foreground text-[0.625rem]">
                  {t("importColumnLegend")}:{" "}
                  <span>{REQUIRED_COLUMNS.join(", ")}</span>
                </div>
              </div>
            </div>
          )}

          {result?.missing.length === 0 && (
            <div className="grid grid-cols-3 gap-2">
              <PreviewStat
                label={t("importPreviewTotal")}
                value={result.total}
                tone="primary"
              />
              <PreviewStat
                label={t("importPreviewMatched")}
                value={result.matched}
                tone="success"
              />
              <PreviewStat
                label={t("importPreviewSkipped")}
                value={result.skipped}
                tone={result.skipped > 0 ? "warning" : "muted"}
              />
            </div>
          )}

          {!file && (
            <div className="border-border/40 bg-muted/40 rounded-lg border p-2">
              <div className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
                {t("importColumnLegend")}
              </div>
              <div className="text-foreground/80 mt-1 text-[0.625rem] leading-relaxed">
                {REQUIRED_COLUMNS.join(", ")}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-border/40 bg-card/40 flex-row gap-2 border-t px-5 py-3 backdrop-blur-sm sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => closeDialog(false)}
          >
            {tc("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!canApply || isParsing}
            onClick={handleApply}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
          >
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            {t("importApply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: "primary" | "success" | "warning" | "muted";
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/5 border-primary/30 text-primary",
    success: "bg-success/5 border-success/30 text-success",
    warning: "bg-warning/5 border-warning/30 text-warning-foreground",
    muted: "bg-muted/40 border-border/40 text-muted-foreground",
  };
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border px-2 py-2",
        toneMap[tone],
      )}
    >
      <div className="text-[0.5rem] font-semibold tracking-widest uppercase opacity-70">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
