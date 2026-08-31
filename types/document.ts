export interface DocumentFile {
  fileToken: string;
  objectName: string;
  originalName: string;
  size: number;
  contentType: string;
  lastModified: string;
  presignedUrl?: string;
}

/** หนึ่งแถวของสรุป — โมดูลต้นทางหนึ่งโมดูล (`reference_type === null` = อัปโหลดจากหน้า Document โดยตรง) */
export interface DocumentSummaryRow {
  reference_type: string | null;
  size: number;
  count: number;
}

/** ยอดสรุปไฟล์แนบทั้ง BU — `by_reference_type` เรียงจากขนาดมากไปน้อยมาจาก backend แล้ว */
export interface DocumentSummary {
  total_size: number;
  total_count: number;
  by_reference_type: DocumentSummaryRow[];
}
