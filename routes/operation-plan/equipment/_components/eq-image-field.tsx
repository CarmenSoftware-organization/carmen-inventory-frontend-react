
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  formatBytes,
} from "@/lib/image-upload";
import { cn } from "@/lib/utils";

export interface EqImageChange {
  /** Newly selected file to upload (replaces existing image), or null. */
  file: File | null;
  /** Whether the existing server image is marked for removal. */
  removed: boolean;
}

interface EqImageFieldProps {
  readonly disabled?: boolean;
  /** Existing image URL from GET (presigned). Shown until replaced or removed. */
  readonly serverImageUrl?: string | null;
  readonly file: File | null;
  readonly removed: boolean;
  readonly onChange: (next: EqImageChange) => void;
}

/**
 * Single-image upload/preview for equipment (controlled). Backend accepts
 * jpeg/png/webp ≤ {IMAGE_MAX_BYTES}; gif is excluded. The parent form owns the
 * selected file + removal flag and sends them as multipart on submit.
 */
export function EqImageField({
  disabled,
  serverImageUrl,
  file,
  removed,
  onChange,
}: EqImageFieldProps) {
  const t = useTranslations("operationPlan.equipment");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  // Revoke the preview object URL when the file changes or on unmount
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  let displayUrl: string | null = null;
  if (file) displayUrl = previewUrl;
  else if (!removed) displayUrl = serverImageUrl ?? null;

  const pickFile = (selected: File) => {
    if (!IMAGE_MIME_TYPES.includes(selected.type)) {
      toast.error(t("imageTypeError"));
      return;
    }
    if (selected.size > IMAGE_MAX_BYTES) {
      toast.error(t("imageSizeError", { size: formatBytes(IMAGE_MAX_BYTES) }));
      return;
    }
    onChange({ file: selected, removed: false });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  };

  const openFilePicker = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <span className="block text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {t("image")}
      </span>

      {displayUrl ? (
        <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-md border bg-muted md:h-56">
          <img
            src={displayUrl}
            alt={t("entity")}
            className="size-full object-contain"
          />
          {!disabled && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={openFilePicker}
                className="shadow"
              >
                <Upload className="size-3" aria-hidden="true" />
                {t("changeImage")}
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                onClick={() => onChange({ file: null, removed: true })}
                aria-label={t("removeImage")}
                className="shadow"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          disabled={disabled}
          className={cn(
            "flex h-44 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 text-center transition-colors md:h-56",
            !disabled && "cursor-pointer hover:bg-muted/60",
            disabled && "cursor-not-allowed opacity-60",
            isDragging && "border-primary bg-primary/10",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-md border bg-card">
            {isDragging ? (
              <Upload className="size-5 text-primary" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-5 text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">{t("dropPhoto")}</div>
            <div className="text-xs text-muted-foreground">
              {t("imageUploadHint", { size: formatBytes(IMAGE_MAX_BYTES) })}
            </div>
          </div>
        </button>
      )}

      <Input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) pickFile(selected);
          e.target.value = "";
        }}
      />
    </div>
  );
}
