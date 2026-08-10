/**
 * Shared client-side image-upload validation. Two families of constraints:
 * - `IMAGE_*` — profile images (user avatar, BU logo, BU avatar): jpeg/png/webp, no gif, 2 MB.
 * - `ALLOWED_IMAGE_*` — content images (product, recipe): jpeg/png/webp/gif, per-consumer max
 *   size (products 5 MB, recipes 8 MB) passed to `validateImageFiles`.
 */

/** Max upload size for profile images — user avatar, BU logo, BU avatar. */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Accepted MIME types for profile images. Backend `UploadLogoBodyDto` allows jpeg/png/webp (no gif). */
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const IMAGE_ACCEPT_ATTR = IMAGE_MIME_TYPES.join(",");

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

export const ALLOWED_IMAGE_ACCEPT_ATTR = ALLOWED_IMAGE_EXTENSIONS.map(
  (e) => `.${e}`,
).join(",");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * เหตุผลที่ไฟล์ไม่ผ่าน — เก็บเป็นรหัส + ตัวเลข ไม่ใช่ประโยคสำเร็จรูป
 *
 * เดิมคืนเป็นข้อความอังกฤษที่ประกอบไว้ในนี้เลย ("Unsupported format (only
 * JPG, PNG…)") แล้วหน้าจอเอาไปโชว์ตรง ๆ คนใช้ที่อ่านไทยเลยเจออังกฤษ · lib
 * แปลเองไม่ได้เพราะไม่มี context ของ i18n จึงส่งรหัสออกไปให้หน้าจอแปลด้วย
 * `fileRejectMessage`
 */
export type FileRejectReason =
  | { code: "format"; formats: string }
  | { code: "size"; size: string; max: string };

export interface FileValidationResult {
  valid: File[];
  rejected: { name: string; reason: FileRejectReason }[];
}

/** แปลงเหตุผลเป็นประโยคของผู้ใช้ — ส่ง `useTranslations("validation")` เข้ามา */
export function fileRejectMessage(
  reason: FileRejectReason,
  tv: (key: string, values?: Record<string, string>) => string,
): string {
  return reason.code === "format"
    ? tv("fileUnsupportedFormat", { formats: reason.formats })
    : tv("fileTooLarge", { size: reason.size, max: reason.max });
}

export function validateImageFiles(
  files: File[],
  maxFileSize: number,
): FileValidationResult {
  const valid: File[] = [];
  const rejected: { name: string; reason: FileRejectReason }[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const typeOk =
      ALLOWED_IMAGE_MIME_TYPES.has(file.type) ||
      (file.type === "" && ALLOWED_IMAGE_EXTENSIONS.includes(ext));
    if (!typeOk) {
      rejected.push({
        name: file.name,
        reason: {
          code: "format",
          formats: ALLOWED_IMAGE_EXTENSIONS.join(", ").toUpperCase(),
        },
      });
      continue;
    }
    if (file.size > maxFileSize) {
      rejected.push({
        name: file.name,
        reason: {
          code: "size",
          size: formatBytes(file.size),
          max: formatBytes(maxFileSize),
        },
      });
      continue;
    }
    valid.push(file);
  }

  return { valid, rejected };
}
