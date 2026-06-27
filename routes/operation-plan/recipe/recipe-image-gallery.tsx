
import { useId, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Plus,
  Star,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_MAX_BYTES,
  formatBytes,
} from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import type { RecipeGalleryController } from "./use-recipe-gallery";

interface RecipeImageGalleryProps {
  readonly disabled?: boolean;
  readonly gallery: RecipeGalleryController;
}

/**
 * Recipe image gallery (controlled). Renders the desired-state gallery from
 * `useRecipeGallery`: hero preview (full image, object-contain) with reorder /
 * set-primary / remove, a thumbnail strip, and an upload affordance. Existing
 * images and new uploads are synced to the backend as a manifest on submit.
 */
export function RecipeImageGallery({
  disabled,
  gallery,
}: RecipeImageGalleryProps) {
  const t = useTranslations("operationPlan.recipe");
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = gallery.items.findIndex((i) => i.isPrimary);
    return idx < 0 ? 0 : idx;
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { items, canAddMore } = gallery;
  const total = items.length;
  const active = total > 0 ? Math.min(activeIndex, total - 1) : 0;
  const hero = total > 0 ? items[active] : null;

  const openFilePicker = () => {
    if (!disabled && canAddMore) fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) gallery.addFiles(e.dataTransfer.files);
  };

  const moveActive = (direction: -1 | 1) => {
    if (!hero) return;
    gallery.move(hero.key, direction);
    setActiveIndex(active + direction);
  };

  return (
    <div className="space-y-2">
      {hero ? (
        <div className="bg-muted relative flex h-44 items-center justify-center overflow-hidden rounded-md border md:h-56 lg:h-64">
          <img
            src={hero.url}
            alt={hero.altText ?? ""}
            className="size-full object-contain"
          />

          {hero.isPrimary && (
            <span className="bg-foreground/70 text-background absolute top-2 left-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider uppercase">
              <Star className="size-2.5 fill-current" aria-hidden="true" />
              {t("hero")}
            </span>
          )}
          <span className="bg-foreground/70 text-background absolute top-2 right-2 rounded px-2 py-0.5 text-[0.625rem] tabular-nums">
            {active + 1} / {total}
          </span>

          {!disabled && (
            <>
              <div className="absolute bottom-2 left-2 flex gap-1.5">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  className="shadow"
                  disabled={active === 0}
                  onClick={() => moveActive(-1)}
                  aria-label={t("moveLeft")}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  className="shadow"
                  disabled={active === total - 1}
                  onClick={() => moveActive(1)}
                  aria-label={t("moveRight")}
                >
                  <ChevronRight className="size-3" />
                </Button>
              </div>
              <div className="absolute right-2 bottom-2 flex gap-1.5">
                {!hero.isPrimary && (
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    className="shadow"
                    onClick={() => gallery.setPrimary(hero.key)}
                  >
                    <Star className="size-3" aria-hidden="true" />
                    {t("setPrimary")}
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  className="shadow"
                  onClick={() => gallery.remove(hero.key)}
                  aria-label={t("removeImage")}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </>
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
            "bg-muted/40 flex h-44 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center transition-colors md:h-56 lg:h-64",
            !disabled && "hover:bg-muted/60 cursor-pointer",
            disabled && "cursor-not-allowed opacity-60",
            isDragging && "border-primary bg-primary/10",
          )}
        >
          <div className="bg-card flex size-12 items-center justify-center rounded-md border">
            {isDragging ? (
              <Upload className="text-primary size-5" aria-hidden="true" />
            ) : (
              <ImageIcon className="text-primary size-5" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">{t("dropHeroPhoto")}</div>
            <div className="text-muted-foreground text-xs">
              {t("imageUploadHint", { size: formatBytes(IMAGE_MAX_BYTES) })}
            </div>
          </div>
        </button>
      )}

      {total > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((img, idx) => (
            <button
              key={img.key}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={img.altText ?? `${idx + 1}`}
              aria-current={idx === active}
              className={cn(
                "relative size-12 shrink-0 overflow-hidden rounded-md border md:size-14",
                idx === active
                  ? "ring-primary ring-2 ring-offset-1"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <img src={img.url} alt="" className="size-full object-cover" />
              {img.isPrimary && (
                <span className="bg-foreground/70 text-background absolute top-0.5 left-0.5 rounded-full p-0.5">
                  <Star className="size-2 fill-current" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
          {!disabled && canAddMore && (
            <button
              type="button"
              onClick={openFilePicker}
              aria-label={t("addImage")}
              className="bg-card text-muted-foreground hover:border-primary hover:text-primary flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed transition-colors md:size-14"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <Input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) gallery.addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
