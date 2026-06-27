import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDeleteProductImage,
  useProductImages,
  useUploadProductImages,
} from "@/hooks/use-product-image";
import type { ProductImage } from "@/types/product-image";
import { type MockImage, validateImageFiles } from "./pd-image-utils";
import { ImageLightbox } from "./pd-image-lightbox";
import { EmptyImage } from "./pd-image-empty";

interface ProductImagesProps {
  /** id ของ product — จำเป็นต่อการโหลด/อัปโหลดรูป (ไม่มี = ยังไม่บันทึก) */
  readonly productId?: string;
  /** เพิ่ม/อัปโหลดรูปได้เฉพาะตอน edit mode — true = ดูอย่างเดียว */
  readonly readOnly?: boolean;
}

/** map รูปจาก API → รูปแบบที่ใช้แสดงผล (url + label) */
function toDisplayImage(img: ProductImage, index: number): MockImage {
  return {
    id: img.id,
    label: img.caption || img.alt_text || `Image ${index + 1}`,
    url: img.url,
  };
}

export function ProductImages({ productId, readOnly }: ProductImagesProps) {
  const { data, isLoading } = useProductImages(productId);
  const uploadImages = useUploadProductImages();
  const deleteImage = useDeleteProductImage();

  const [activeIndex, setActiveIndex] = useState(0);
  const [dialogIndex, setDialogIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MockImage | null>(null);

  const images = (data?.data.images ?? [])
    .toSorted((a, b) => a.sort_order - b.sort_order)
    .map(toDisplayImage);
  const total = images.length;
  // clamp index กันหลุดช่วงหลัง refetch (จำนวนรูปเปลี่ยน)
  const safeIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);
  const goPrev = () => setActiveIndex((safeIndex - 1 + total) % total);
  const goNext = () => setActiveIndex((safeIndex + 1) % total);

  const handleAddFiles = (files: FileList | File[]) => {
    const { valid, rejected } = validateImageFiles(Array.from(files));

    if (rejected.length > 0) {
      toast.error(
        rejected.length === 1
          ? `${rejected[0].name}: ${rejected[0].reason}`
          : `${rejected.length} files rejected — ${rejected[0].name}: ${rejected[0].reason}`,
      );
    }

    if (valid.length === 0 || !productId || uploadImages.isPending) return;

    uploadImages.mutate(
      { product_id: productId, images: valid },
      {
        onSuccess: () => toast.success(`${valid.length} image(s) uploaded`),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || !productId) return;
    deleteImage.mutate(
      { product_id: productId, imageId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Image deleted");
          setDeleteTarget(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (isLoading) {
    return <Skeleton className="aspect-square w-full rounded-lg" />;
  }

  if (total === 0) {
    if (readOnly) {
      return (
        <div className="text-muted-foreground flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
          <ImageIcon className="size-10 opacity-60" aria-hidden="true" />
          <p className="text-xs">No images</p>
        </div>
      );
    }
    return <EmptyImage onAddFiles={handleAddFiles} />;
  }

  const active = images[safeIndex];

  return (
    <div className="space-y-3">
      <div className="group relative">
        <button
          type="button"
          onClick={() => setDialogIndex(safeIndex)}
          aria-label={`View ${active.label} in larger view`}
          className="ring-offset-background focus-visible:ring-ring relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <img
            src={active.url}
            alt={active.label}
            className="absolute inset-0 size-full object-cover"
          />
          <span className="bg-background text-foreground absolute bottom-2 left-2 rounded px-2 py-0.5 text-[0.6875rem] font-semibold">
            {active.label}
          </span>
          <span className="bg-background text-muted-foreground absolute right-2 bottom-2 rounded px-2 py-0.5 text-[0.6875rem] tabular-nums">
            {safeIndex + 1} / {total}
          </span>
        </button>

        {!readOnly && (
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label="Delete image"
            onClick={() => setDeleteTarget(active)}
            disabled={deleteImage.isPending}
            className="absolute top-2 right-2 opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 />
          </Button>
        )}

        {total > 1 && (
          <>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label="Previous image"
              onClick={goPrev}
              className="absolute top-1/2 left-2 -translate-y-1/2 opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label="Next image"
              onClick={goNext}
              className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-3 overflow-x-auto px-1 pt-2 pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Show ${img.label}`}
              aria-current={idx === safeIndex}
              className={cn(
                "ring-offset-background focus-visible:ring-ring relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                idx === safeIndex
                  ? "ring-primary ring-2 ring-offset-2"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <img
                src={img.url}
                alt={img.label}
                className="absolute inset-0 size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        index={dialogIndex}
        onIndexChange={setDialogIndex}
        onAddFiles={readOnly ? undefined : handleAddFiles}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteImage.isPending && setDeleteTarget(null)
        }
        title="Delete Image"
        description="Delete this image? This action cannot be undone."
        isPending={deleteImage.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
