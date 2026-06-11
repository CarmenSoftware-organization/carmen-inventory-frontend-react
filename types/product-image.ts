export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
  /** วันหมดอายุของ presigned URL (`url`) */
  expires_at: string;
}

/** GET `/products/{id}/images` → `{ data: { images: [...] }, ... }` */
export interface ProductImagesResponse {
  data: { images: ProductImage[] };
  status: number;
  success: boolean;
  message: string;
  timestamp: string;
}

/**
 * ข้อมูลที่อัปโหลดได้ใน multipart POST — ไฟล์รูป 1..10 ไฟล์
 * (format/size ตรวจด้วย global `validateImageFiles` จาก `@/lib/image-upload`)
 * พร้อม alt_texts/captions ที่ match ตามตำแหน่ง index
 */
export interface UploadProductImagesDto {
  images: File[];
  alt_texts?: string[];
  captions?: string[];
}

/** เมทาดาทาที่แก้ไขได้ของรูป (PATCH, body เป็น JSON) */
export interface UpdateProductImageDto {
  alt_text?: string | null;
  caption?: string | null;
  is_primary?: boolean;
}
