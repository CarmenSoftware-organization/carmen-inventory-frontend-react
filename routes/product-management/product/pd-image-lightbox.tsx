import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTR, type MockImage } from "./pd-image-utils";

interface Props {
  readonly images: MockImage[];
  readonly index: number | null;
  readonly onIndexChange: (next: number | null) => void;
  /** ไม่ส่ง = read-only (ซ่อนปุ่ม upload + ปิด drag-drop) */
  readonly onAddFiles?: (files: FileList | File[]) => void;
}

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onAddFiles,
}: Props) {
  const open = index !== null;
  const total = images.length;
  const current = open ? images[index] : null;
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const goPrev = () => {
    if (index === null) return;
    onIndexChange((index - 1 + total) % total);
  };

  const goNext = () => {
    if (index === null) return;
    onIndexChange((index + 1) % total);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        if (index === null) return;
        onIndexChange((index - 1 + total) % total);
      }
      if (e.key === "ArrowRight") {
        if (index === null) return;
        onIndexChange((index + 1) % total);
      }
    };
    globalThis.window.addEventListener("keydown", onKey);
    return () => globalThis.window.removeEventListener("keydown", onKey);
  }, [open, index, total, onIndexChange]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (onAddFiles && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-[min(56rem,92vw)] overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">
          {current ? `Image: ${current.label}` : "Image viewer"}
        </DialogTitle>

        {current && (
          <section
            aria-label="Image viewer (drop images to upload)"
            className="relative flex flex-col"
            onDragOver={
              onAddFiles
                ? (e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }
                : undefined
            }
            onDragLeave={
              onAddFiles
                ? (e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node))
                      return;
                    setIsDragging(false);
                  }
                : undefined
            }
            onDrop={onAddFiles ? handleDrop : undefined}
          >
            {isDragging && onAddFiles && (
              <div className="border-primary bg-primary/15 text-primary pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed">
                <Upload className="size-10" aria-hidden="true" />
                <p className="text-sm font-semibold">Drop images to upload</p>
              </div>
            )}
            <div className="relative aspect-4/3 w-full bg-black/95">
              <img
                src={current.url}
                alt={current.label}
                className="absolute inset-0 size-full object-contain"
              />
              <div className="bg-background text-foreground absolute top-3 left-3 rounded-md px-2 py-1 text-xs font-semibold">
                {current.label}
              </div>
              <div className="bg-background text-muted-foreground absolute top-3 right-12 rounded-md px-2 py-1 text-xs tabular-nums">
                {(index ?? 0) + 1} / {total}
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Close"
                  className="absolute top-3 right-3 shadow"
                >
                  <X />
                </Button>
              </DialogClose>

              {total > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="secondary"
                    aria-label="Previous image"
                    onClick={goPrev}
                    className="absolute top-1/2 left-3 -translate-y-1/2 shadow"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="secondary"
                    aria-label="Next image"
                    onClick={goNext}
                    className="absolute top-1/2 right-3 -translate-y-1/2 shadow"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>

            <div className="bg-background flex items-center gap-3 overflow-x-auto border-t px-4 py-3">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onIndexChange(idx)}
                  aria-label={`Show ${img.label}`}
                  aria-current={idx === index}
                  className={cn(
                    "ring-offset-background focus-visible:ring-ring relative flex size-16 shrink-0 cursor-pointer flex-col items-end justify-end overflow-hidden rounded-md border p-1 text-[0.625rem] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    idx === index
                      ? "ring-primary ring-2 ring-offset-1"
                      : "opacity-60 hover:opacity-100",
                  )}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="absolute inset-0 size-full object-cover"
                  />
                  <span className="bg-background text-foreground relative rounded px-1 py-0.5">
                    {idx + 1}
                  </span>
                </button>
              ))}

              {onAddFiles && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload images"
                    className="text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 ring-offset-background focus-visible:ring-ring flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-[0.625rem] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    <span>Upload</span>
                  </button>

                  <Input
                    ref={fileInputRef}
                    id={fileInputId}
                    type="file"
                    accept={ACCEPT_ATTR}
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        onAddFiles(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />
                </>
              )}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
