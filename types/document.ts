export interface DocumentFile {
  fileToken: string;
  objectName: string;
  originalName: string;
  size: number;
  contentType: string;
  lastModified: string;
  presignedUrl?: string;
}

interface DocumentSummaryRow {
  reference_type: string | null;
  size: number;
  count: number;
}

export interface DocumentSummary {
  total_size: number;
  total_count: number;
  by_reference_type: DocumentSummaryRow[];
}
