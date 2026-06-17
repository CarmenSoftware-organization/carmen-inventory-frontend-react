export interface RunningCode {
  id: string;
  doc_version?: number;
  type: string;
  config: Record<string, unknown>;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRunningCodeDto {
  doc_version?: number;
  type: string;
  config: Record<string, unknown>;
  note: string;
}
