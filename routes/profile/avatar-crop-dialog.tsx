
import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AvatarCropDialogProps {
  /** Object URL or data URL of the source image, or null to keep the dialog closed */
  readonly src: string | null;
  /** Suggested filename used when constructing the cropped File */
  readonly filename: string;
  /** True while the parent is uploading the crop result — disables actions */
  readonly isSubmitting?: boolean;
  readonly onClose: () => void;
  /** Called with the cropped image as a File when user confirms */
  readonly onConfirm: (file: File) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Dialog ครอบ avatar + ปรับ zoom 1x–3x ก่อนอัปโหลด — aspect ratio 1:1
 *
 * Flow: parent ส่ง `src` (data URL จาก FileReader) → dialog เปิด → user drag/zoom →
 * confirm → render canvas → คืน File ผ่าน `onConfirm` → parent ยิง API
 */
export function AvatarCropDialog({
  src,
  filename,
  isSubmitting = false,
  onClose,
  onConfirm,
}: AvatarCropDialogProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  // Reset transient state whenever a new source image arrives. Adjusting state
  // during render (instead of in an effect) avoids cascading re-renders and
  // applies the reset before the cropper paints the new image.
  const [prevSrc, setPrevSrc] = useState<string | null>(src);
  if (src && src !== prevSrc) {
    setPrevSrc(src);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setProcessing(false);
  }

  const handleCropComplete = (_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  };

  const handleConfirm = async () => {
    if (!src || !croppedArea) return;
    setProcessing(true);
    try {
      const blob = await renderCroppedBlob(src, croppedArea);
      const file = new File([blob], filename, { type: blob.type });
      onConfirm(file);
    } catch {
      // Surface a generic toast/handler by no-op here; parent will show fail
      // toast via the upload mutation onError once the file goes through.
      setProcessing(false);
    }
  };

  const busy = processing || isSubmitting;

  return (
    <Dialog open={!!src} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("cropAvatarTitle")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("cropAvatarDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Crop viewport — square 1:1 */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomSpeed={0.4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            disabled={busy || zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.1))}
            aria-label={t("zoomOut")}
          >
            <ZoomOut aria-hidden="true" />
          </Button>
          <input
            type="range"
            value={zoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            disabled={busy}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={t("zoom")}
            className="bg-muted h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            disabled={busy || zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.1))}
            aria-label={t("zoomIn")}
          >
            <ZoomIn aria-hidden="true" />
          </Button>
          <span className="text-muted-foreground w-10 text-right text-[0.6875rem] tabular-nums">
            {zoom.toFixed(1)}×
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || !croppedArea}
            onClick={handleConfirm}
          >
            {busy && (
              <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            )}
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Load an image source (data URL / object URL) into an HTMLImageElement so we
 * can draw it onto a canvas.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Render the user's crop region into a Blob (PNG by default, JPEG if the
 * source was JPEG — keeps file size sensible for photos).
 */
async function renderCroppedBlob(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );
  const mimeType = src.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      mimeType,
      0.92,
    );
  });
}
