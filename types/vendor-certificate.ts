export interface VendorCertificate {
  id: string;
  master_certificate_id: string;
  certificate_no: string;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
  doc_version?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorCertificateDto {
  master_certificate_id: string;
  certificate_no: string;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
}
