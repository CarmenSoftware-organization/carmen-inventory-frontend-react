export interface AppConfig {
  id: string;
  key: string;
  value: Record<string, unknown>;
  created_at: string | null;
  created_by_id: string | null;
  updated_at: string | null;
  updated_by_id: string | null;
}

