export interface RunningCode {
  id: string;
  type: string;
  config: Record<string, unknown>;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRunningCodeDto {
  type: string;
  config: Record<string, unknown>;
  note: string;
}
