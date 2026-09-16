export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
  expires_at: string;
}

export interface ProductImagesResponse {
  data: { images: ProductImage[] };
  status: number;
  success: boolean;
  message: string;
  timestamp: string;
}

export interface UploadProductImagesDto {
  images: File[];
  alt_texts?: string[];
  captions?: string[];
}

export interface UpdateProductImageDto {
  alt_text?: string | null;
  caption?: string | null;
  is_primary?: boolean;
}
