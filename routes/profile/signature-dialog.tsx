import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_MAX_BYTES,
  validateImageFiles,
} from "@/lib/image-upload";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

interface SignatureDialogProps {
  readonly open: boolean;
  readonly isSubmitting?: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Called with the final PNG File when the user saves */
  readonly onConfirm: (file: File) => void;
}

/** Convert a data URL (e.g. from canvas.toDataURL) to a File */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Dialog for setting a signature via two tabs: Draw (canvas) or Upload (image
 * file). Produces a PNG File and hands it to `onConfirm`; the parent owns the
 * upload mutation.
 */
export function SignatureDialog({
  open,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: SignatureDialogProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const padRef = useRef<SignaturePadHandle>(null);
  const [drawDirty, setDrawDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset all transient state when the dialog (re)opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTab("draw");
      setDrawDirty(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadError(null);
      // The Radix Dialog unmounts its content on close, so the file input is
      // recreated empty on reopen — no manual value reset needed here.
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const { valid, rejected } = validateImageFiles([file], IMAGE_MAX_BYTES);
    if (rejected.length > 0) {
      setUploadError(rejected[0].reason);
      setUploadFile(null);
      setUploadPreview(null);
      e.target.value = "";
      return;
    }
    const accepted = valid[0];
    setUploadFile(accepted);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(accepted);
  };

  const handleClearDraw = () => {
    padRef.current?.clear();
    setDrawDirty(false);
  };

  // `drawDirty` tracks whether at least one stroke exists (set on stroke start,
  // reset on Clear) — reading padRef during render is disallowed.
  const canSave =
    !isSubmitting && (tab === "draw" ? drawDirty : !!uploadFile);

  const handleSave = () => {
    if (tab === "draw") {
      const dataUrl = padRef.current?.toPngDataUrl();
      if (!dataUrl) return;
      onConfirm(dataUrlToFile(dataUrl, "signature.png"));
    } else if (uploadFile) {
      onConfirm(uploadFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("signatureTitle")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("signatureDesc")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "draw" | "upload")}>
          <TabsList className="w-full">
            <TabsTrigger value="draw" className="flex-1 text-xs">
              {t("drawSignature")}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 text-xs">
              {t("uploadSignature")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-2">
            <SignaturePad
              ref={padRef}
              disabled={isSubmitting}
              onBeginStroke={() => setDrawDirty(true)}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting || !drawDirty}
                onClick={handleClearDraw}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                {t("clearSignature")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="bg-muted/30 hover:bg-muted/50 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt={t("signature")}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <>
                  <Upload
                    className="text-muted-foreground size-6"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground text-xs">
                    {t("signatureUploadHint")}
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              data-testid="signature-file-input"
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              disabled={isSubmitting}
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadError && (
              <p
                data-testid="signature-upload-error"
                className="text-destructive text-xs"
              >
                {uploadError}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            onClick={handleSave}
          >
            {isSubmitting && (
              <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            )}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
