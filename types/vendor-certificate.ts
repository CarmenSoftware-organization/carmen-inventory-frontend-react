export interface VendorCertificate {
  id: string;
  master_certificate_id: string;
  certificate_no: string;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
  doc_version?: number;
}

export interface CreateVendorCertificateDto {
  master_certificate_id: string;
  certificate_no: string;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
}
