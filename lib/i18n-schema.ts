export type TranslationFn = ((
  key: string,
  values?: Record<string, string | number>,
) => string) & {
  // use-intl มีให้อยู่แล้ว ประกาศไว้เพื่อเช็คก่อนเรียก `t()` ด้วยคีย์ที่อาจไม่มีจริง
  // (คีย์ไม่มี = use-intl คืน path ดิบออกหน้าจอ ไม่ใช่ throw)
  has?: (key: string) => boolean;
};
