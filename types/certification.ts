export interface Certification {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCertificationDto {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}
