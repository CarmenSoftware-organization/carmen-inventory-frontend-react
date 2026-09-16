import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  formatBytes,
} from "@/lib/image-upload";
import type { RecipeImage, RecipeGalleryManifestItem } from "@/types/recipe";

const MAX_IMAGES = 10;

export interface RecipeGalleryItem {
  key: string;
  id: string | null;
  file: File | null;
  url: string;
  altText: string | null;
  isPrimary: boolean;
}

export interface RecipeGalleryPayload {
  files: File[];
  manifest: RecipeGalleryManifestItem[];
  count: number;
  isDirty: boolean;
}

export interface RecipeGalleryController {
  items: RecipeGalleryItem[];
  isDirty: boolean;
  canAddMore: boolean;
  addFiles: (files: FileList | File[]) => void;
  remove: (key: string) => void;
  setPrimary: (key: string) => void;
  move: (key: string, direction: -1 | 1) => void;
  reset: () => void;
  buildPayload: () => RecipeGalleryPayload;
}

function toItems(
  images: readonly RecipeImage[] | undefined,
): RecipeGalleryItem[] {
  return [...(images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      key: img.id,
      id: img.id,
      file: null,
      url: img.url,
      altText: img.alt_text,
      isPrimary: img.is_primary,
    }));
}

function ensurePrimary(items: RecipeGalleryItem[]): RecipeGalleryItem[] {
  if (items.length === 0) return items;
  let primaryIdx = items.findIndex((i) => i.isPrimary);
  if (primaryIdx < 0) primaryIdx = 0;
  return items.map((item, idx) => {
    const isPrimary = idx === primaryIdx;
    return item.isPrimary === isPrimary ? item : { ...item, isPrimary };
  });
}

export function useRecipeGallery(
  initialImages?: readonly RecipeImage[],
): RecipeGalleryController {
  const t = useTranslations("operationPlan.recipe");
  const initialRef = useRef(initialImages);
  const [items, setItems] = useState<RecipeGalleryItem[]>(() =>
    toItems(initialImages),
  );
  const [isDirty, setIsDirty] = useState(false);
  const createdBlobs = useRef<Set<string>>(new Set());

  // Revoke every object URL we created when the gallery unmounts
  useEffect(() => {
    const blobs = createdBlobs.current;
    return () => blobs.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const room = MAX_IMAGES - items.length;
    if (room <= 0) {
      toast.warning(t("maxImages", { max: MAX_IMAGES }));
      return;
    }
    const accepted: RecipeGalleryItem[] = [];
    for (const file of Array.from(files)) {
      if (accepted.length >= room) {
        toast.warning(t("maxImages", { max: MAX_IMAGES }));
        break;
      }
      if (!IMAGE_MIME_TYPES.includes(file.type)) {
        toast.warning(t("imageTypeError"));
        continue;
      }
      if (file.size > IMAGE_MAX_BYTES) {
        toast.warning(
          t("imageSizeError", { size: formatBytes(IMAGE_MAX_BYTES) }),
        );
        continue;
      }
      const url = URL.createObjectURL(file);
      createdBlobs.current.add(url);
      accepted.push({
        key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        id: null,
        file,
        url,
        altText: null,
        isPrimary: false,
      });
    }
    if (accepted.length === 0) return;
    setItems((prev) => ensurePrimary([...prev, ...accepted]));
    setIsDirty(true);
  };

  const remove = (key: string) => {
    const target = items.find((i) => i.key === key);
    if (target?.file && target.url.startsWith("blob:")) {
      URL.revokeObjectURL(target.url);
      createdBlobs.current.delete(target.url);
    }
    setItems((prev) => ensurePrimary(prev.filter((i) => i.key !== key)));
    setIsDirty(true);
  };

  const setPrimary = (key: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.isPrimary === (i.key === key)
          ? i
          : { ...i, isPrimary: i.key === key },
      ),
    );
    setIsDirty(true);
  };

  const move = (key: string, direction: -1 | 1) => {
    const idx = items.findIndex((i) => i.key === key);
    const to = idx + direction;
    if (idx < 0 || to < 0 || to >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
    setIsDirty(true);
  };

  const reset = () => {
    createdBlobs.current.forEach((url) => URL.revokeObjectURL(url));
    createdBlobs.current.clear();
    setItems(toItems(initialRef.current));
    setIsDirty(false);
  };

  const buildPayload = (): RecipeGalleryPayload => {
    const files = items
      .filter((i): i is RecipeGalleryItem & { file: File } => i.file !== null)
      .map((i) => i.file);
    let fileIndex = 0;
    const manifest: RecipeGalleryManifestItem[] = items.map((item) => {
      if (item.id) {
        const entry: RecipeGalleryManifestItem = { id: item.id };
        if (item.isPrimary) entry.is_primary = true;
        if (item.altText) entry.alt_text = item.altText;
        return entry;
      }
      const entry: RecipeGalleryManifestItem = { file_index: fileIndex };
      fileIndex += 1;
      if (item.isPrimary) entry.is_primary = true;
      if (item.altText) entry.alt_text = item.altText;
      return entry;
    });
    return { files, manifest, count: items.length, isDirty };
  };

  return {
    items,
    isDirty,
    canAddMore: items.length < MAX_IMAGES,
    addFiles,
    remove,
    setPrimary,
    move,
    reset,
    buildPayload,
  };
}
