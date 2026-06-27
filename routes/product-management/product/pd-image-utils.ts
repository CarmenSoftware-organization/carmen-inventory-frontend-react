import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_ACCEPT_ATTR,
  IMAGE_MAX_BYTES,
  formatBytes,
  validateImageFiles as validateFiles,
} from "@/lib/image-upload";

export { formatBytes };
export const ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS;
export const ACCEPT_ATTR = ALLOWED_IMAGE_ACCEPT_ATTR;
export const MAX_FILE_SIZE = IMAGE_MAX_BYTES;

export interface MockImage {
  id: string;
  label: string;
  url: string;
}

export function validateImageFiles(files: File[]) {
  return validateFiles(files, MAX_FILE_SIZE);
}
