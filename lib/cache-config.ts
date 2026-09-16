export type CacheProfile = {
  readonly staleTime: number;
  readonly gcTime: number;
};

export const CACHE_STATIC = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
} as const;

export const CACHE_NORMAL = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
} as const;

export const CACHE_DYNAMIC = {
  staleTime: 1 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
} as const;

/**
 * ห้าม cache — ยอดคงเหลือ/ของที่กำลังสั่ง ต้องเป็นค่าปัจจุบันเสมอ ข้อมูลค้างแค่
 * นาทีเดียวก็พอให้คนสั่งซื้อซ้ำของที่เพิ่งรับเข้าไปแล้ว ใช้คู่กับ
 * `refetchOnMount: "always"` ที่ hook นั้น ๆ (staleTime 0 อย่างเดียวยังกินค่าเก่า
 * ที่ค้างใน gc ไปแสดงก่อนแล้วค่อยยิงตาม)
 */
export const CACHE_NONE = {
  staleTime: 0,
  gcTime: 0,
} as const;
