
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ImageIcon, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export interface LightboxImage {
  src: string;
  fileName: string;
}

interface ImageLightboxProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly images: LightboxImage[];
  readonly startIndex?: number;
}

interface CarouselSlideProps {
  readonly image: LightboxImage;
}

function CarouselSlide({ image }: CarouselSlideProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="bg-muted/30 flex h-[60vh] flex-col items-center justify-center gap-2 rounded">
        <ImageIcon
          className="text-muted-foreground size-12"
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-sm">โหลดรูปไม่สำเร็จ</p>
        <p className="text-muted-foreground/70 text-xs">{image.fileName}</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 flex h-[60vh] items-center justify-center rounded p-2">
      {/* plain <img>: ไม่มี @next/next/jsx-a11y plugin ใน Vite eslint config */}
      <img
        src={image.src}
        alt={image.fileName}
        className="max-h-full max-w-full rounded object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/**
 * Dialog แสดงภาพ attachment พร้อม carousel เมื่อมีหลายภาพ
 * ใช้ Radix Dialog เพื่อให้เข้า dismissable layer stack อย่างถูกต้อง
 * เมื่อเปิด lightbox อยู่ Sheet ที่อยู่ใต้จะไม่ตอบ click outside ของตัวเอง
 * z-index 100 สูงกว่า Sheet/Dialog (z-50)
 */
export function ImageLightbox({
  open,
  onClose,
  images,
  startIndex = 0,
}: ImageLightboxProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (!api || !open) return;
    const id = requestAnimationFrame(() => {
      api.reInit();
      api.scrollTo(startIndex, true);
      setCurrentIndex(api.selectedScrollSnap());
    });
    return () => cancelAnimationFrame(id);
  }, [api, startIndex, open]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  if (images.length === 0) return null;

  const current = images[currentIndex] ?? images[0];

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 bg-background fixed top-[50%] left-[50%] z-[100] flex max-h-[90vh] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border shadow-xl duration-150 outline-none"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <DialogPrimitive.Title className="truncate text-sm font-medium">
                {current.fileName}
              </DialogPrimitive.Title>
              {images.length > 1 && (
                <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                asChild
                size="icon-sm"
                variant="ghost"
                aria-label="Download"
              >
                <a
                  href={current.src}
                  download={current.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-4" />
                </a>
              </Button>
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="relative px-4 py-4 sm:px-12">
            <Carousel
              opts={{ startIndex, loop: true }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent>
                {images.map((img, i) => (
                  <CarouselItem key={`${img.fileName}-${i}`}>
                    <CarouselSlide image={img} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {images.length > 1 && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Previous"
                  onClick={() => api?.scrollPrev()}
                  className="absolute top-1/2 left-2 size-8 -translate-y-1/2 rounded-full shadow-md sm:left-4"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Next"
                  onClick={() => api?.scrollNext()}
                  className="absolute top-1/2 right-2 size-8 -translate-y-1/2 rounded-full shadow-md sm:right-4"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="bg-muted/30 flex justify-center gap-1.5 overflow-x-auto border-t px-3 py-2">
              {images.map((img, i) => (
                <button
                  key={`thumb-${img.fileName}-${i}`}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`${img.fileName} (${i + 1}/${images.length})`}
                  aria-current={i === currentIndex}
                  className={`relative size-14 shrink-0 overflow-hidden rounded border-2 transition ${
                    i === currentIndex
                      ? "border-primary ring-primary/30 ring-2"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.src}
                    alt={img.fileName}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
