export interface Certification {
  id: string;
  doc_version: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCertificationDto {
  doc_version?: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}
