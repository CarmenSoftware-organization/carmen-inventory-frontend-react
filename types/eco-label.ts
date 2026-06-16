export interface EcoLabel {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doc_version?: number;
}

export interface CreateEcoLabelDto {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  // Optimistic-concurrency token; required by the backend on update (PATCH).
  doc_version?: number;
  // This endpoint reads the record fields (and doc_version on update) from a
  // wrapped `metadata` object; sending it flat yields a 400 MISSING_METADATA.
  metadata?: Record<string, unknown>;
}
