
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  formatBytes,
} from "@/lib/image-upload";
import type {
  RecipeImage,
  RecipeGalleryManifestItem,
} from "@/types/recipe";

/** Max images per recipe (backend limit). */
const MAX_IMAGES = 10;

/** One gallery slot — an existing server image (`id`) or a pending upload (`file`). */
export interface RecipeGalleryItem {
  /** Stable React key. */
  key: string;
  /** Existing image id, or null for a new upload. */
  id: string | null;
  /** New file to upload, or null for an existing image. */
  file: File | null;
  /** Display URL — presigned (existing) or object URL (new). */
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

/** Map server images → gallery items, preserving sort_order (primary flagged, not reordered). */
function toItems(images: readonly RecipeImage[] | undefined): RecipeGalleryItem[] {
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

/** Guarantee exactly one primary (first item if none flagged). */
function ensurePrimary(items: RecipeGalleryItem[]): RecipeGalleryItem[] {
  if (items.length === 0) return items;
  let primaryIdx = items.findIndex((i) => i.isPrimary);
  if (primaryIdx < 0) primaryIdx = 0;
  return items.map((item, idx) => {
    const isPrimary = idx === primaryIdx;
    return item.isPrimary === isPrimary ? item : { ...item, isPrimary };
  });
}

/**
 * จัดการสถานะ gallery ของ recipe เป็น "desired state" — รูปเดิม (อ้างด้วย id) + รูปใหม่ (ไฟล์)
 *
 * จับ object URL ของรูปใหม่ใน ref แล้ว revoke ตอน remove/unmount/reset
 * `buildPayload()` คืน `images` (ไฟล์ใหม่ตามลำดับ) + `manifest` (id หรือ file_index) สำหรับส่ง multipart
 * `isDirty` จะ true เมื่อมีการ เพิ่ม/ลบ/เรียง/เปลี่ยน primary — ใช้ตัดสินใจว่าจะส่ง gallery ไหม
 *
 * @param initialImages - รูปจาก GET (จะถูก sort ตาม sort_order)
 * @returns controller สำหรับผูกกับ `RecipeImageGallery` + เรียกตอน submit
 */
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
      toast.error(t("maxImages", { max: MAX_IMAGES }));
      return;
    }
    const accepted: RecipeGalleryItem[] = [];
    for (const file of Array.from(files)) {
      if (accepted.length >= room) {
        toast.error(t("maxImages", { max: MAX_IMAGES }));
        break;
      }
      if (!IMAGE_MIME_TYPES.includes(file.type)) {
        toast.error(t("imageTypeError"));
        continue;
      }
      if (file.size > IMAGE_MAX_BYTES) {
        toast.error(t("imageSizeError", { size: formatBytes(IMAGE_MAX_BYTES) }));
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
      prev.map((i) => (i.isPrimary === (i.key === key) ? i : { ...i, isPrimary: i.key === key })),
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
