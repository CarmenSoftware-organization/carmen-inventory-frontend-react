export interface VendorInfoItem {
  label: string;
  value: string;
  data_type: string;
}

export interface VendorAddressData {
  address_line1: string;
  address_line2: string;
  city: string;
  district: string;
  sub_district: string;
  province: string;
  postal_code: string;
  country: string;
}

export interface VendorAddress extends VendorAddressData {
  id?: string;
  address_type: string;
  is_active: boolean;
}

export interface VendorContact {
  id?: string;
  name: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  business_type: { id: string; name: string }[];
  contacts?: VendorContact[];
  /** @deprecated use `contacts` */
  tb_vendor_contact?: VendorContact[];
  created_at: string;
  updated_at: string;
  /** Optimistic-concurrency version; required when PATCHing the record. */
  doc_version: number;
}

export interface VendorDetail extends Vendor {
  description: string;
  info: VendorInfoItem[];
  vendor_address: VendorAddress[];
  vendor_contact: VendorContact[];
}

interface VendorAddressPayload extends VendorAddressData {
  address_type: string;
}

export interface CreateVendorDto {
  /** Sent on update only — backend requires it for optimistic concurrency. */
  doc_version?: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  business_type: { id: string; name: string }[];
  info: VendorInfoItem[];
  vendor_address: {
    add?: VendorAddressPayload[];
    update?: (VendorAddressPayload & { vendor_address_id: string })[];
    remove?: { vendor_address_id: string }[];
  };
  vendor_contact: {
    add?: Omit<VendorContact, "id">[];
    update?: (Omit<VendorContact, "id"> & { vendor_contact_id: string })[];
    remove?: { vendor_contact_id: string }[];
  };
}
