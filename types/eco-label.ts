export interface EcoLabel {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEcoLabelDto {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}
