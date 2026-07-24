import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PriceListExternalImportDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** เรียกเมื่อ vendor เลือก/วางไฟล์ — parent จัดการ parse + save เอง */
  readonly onFile: (file: File) => void;
  readonly isImporting?: boolean;
}

/**
 * dialog import excel ของ portal — รับไฟล์ได้ทั้ง drag & drop และเลือกจากเครื่อง
 * (mirror dropzone ของ EntryImportDialog แต่เบากว่า · อังกฤษ hardcode เหมือน
 * ส่วนอื่นของหน้า public นี้) · เลือกไฟล์แล้วปิด dialog แล้วส่งต่อให้ parent
 */
export default function PriceListExternalImportDialog({
  open,
  onOpenChange,
  onFile,
  isImporting = false,
}: PriceListExternalImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (file?: File | null) => {
    if (!file) return;
    onOpenChange(false);
    onFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
    choose(f);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    choose(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" aria-hidden="true" />
            Import from Excel
          </DialogTitle>
          <DialogDescription className="text-xs">
            Drag &amp; drop your filled file here, or click to browse. Rows are
            matched by the &ldquo;No.&rdquo; column and saved as a draft.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleChange}
          aria-label="Choose Excel file"
        />

        <button
          type="button"
          disabled={isImporting}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            // neutral โดย default · accent โผล่ตอนลากไฟล์อย่างเดียว (single signal
            // ตาม DESIGN.md — ไม่คลัสเตอร์สีทั้ง border+bg+ไอคอน)
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-muted-foreground/40",
            isImporting && "pointer-events-none opacity-60",
          )}
        >
          <FileSpreadsheet
            className="text-muted-foreground size-8"
            aria-hidden="true"
          />
          <span className="text-foreground text-xs font-semibold">
            {isImporting ? "Importing…" : "Drop Excel file or click to browse"}
          </span>
          <span className="text-muted-foreground text-[0.625rem] tracking-wide uppercase">
            .xlsx, .xls
          </span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
