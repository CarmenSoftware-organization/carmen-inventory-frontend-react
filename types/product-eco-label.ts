export interface ProductEcoLabel {
  id: string;
  master_eco_label_id: string;
  certificate_no: string;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
  doc_version?: number;
}

export interface CreateProductEcoLabelDto {
  master_eco_label_id: string;
  certificate_no: string;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
}
