import type { Audit } from "./audit";

/**
 * ยอดปกติของบัญชี — ฝั่งไหนทำให้ยอดเพิ่ม
 * backend เก็บเป็น lowercase ส่งตัวใหญ่ไปได้ 400
 */
export enum ACCOUNT_NATURE {
  DEBIT = "debit",
  CREDIT = "credit",
}

/**
 * ประเภทของบัญชีในผัง — `header` ไม่ใช่บัญชีที่ลงรายการได้ เป็นหัวข้อไว้จัดกลุ่ม
 * ส่วนอีกสามตัวคือบัญชีที่ยอดไปโผล่ในงบนั้น ๆ (`statistic` = ตัวเลขสถิติ ไม่เข้างบ)
 */
export enum ACCOUNT_CODE_TYPE {
  HEADER = "header",
  BALANCE_SHEET = "balance_sheet",
  INCOME_STATEMENT = "income_statement",
  STATISTIC = "statistic",
}

export const ACCOUNT_NATURES = [
  ACCOUNT_NATURE.DEBIT,
  ACCOUNT_NATURE.CREDIT,
] as const;

export const ACCOUNT_CODE_TYPES = [
  ACCOUNT_CODE_TYPE.HEADER,
  ACCOUNT_CODE_TYPE.BALANCE_SHEET,
  ACCOUNT_CODE_TYPE.INCOME_STATEMENT,
  ACCOUNT_CODE_TYPE.STATISTIC,
] as const;

/** ผังบัญชีของ BU — master data จาก `GET /api/config/{bu}/chart-of-accounts` */
export interface AccountCode {
  id: string;
  doc_version: number;
  code: string;
  /** ชื่อบัญชีที่คนอ่าน เช่น "Inventory - Food" */
  description_1: string;
  /** คำอธิบายบรรทัดที่สอง — ไม่บังคับ ใช้ขยายความชื่อบัญชี */
  description_2?: string | null;
  nature: ACCOUNT_NATURE;
  type: ACCOUNT_CODE_TYPE;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateAccountCodeDto {
  doc_version?: number;
  code: string;
  description_1: string;
  description_2?: string | null;
  nature: ACCOUNT_NATURE;
  type: ACCOUNT_CODE_TYPE;
  is_active: boolean;
}
