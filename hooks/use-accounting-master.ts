import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { useBuCode } from "@/hooks/use-bu-code";
import type {
  BankAccountMaster,
  PaymentTypeMaster,
  WhtFormMaster,
  WhtServiceTypeMaster,
  TitleMaster,
  GlPeriodMaster,
} from "@/types/accounting-master";

export const DEFAULT_BANK_ACCOUNTS: BankAccountMaster[] = [
  {
    id: "bank-kbank-01",
    bank_name: "Kasikorn Bank (KBANK)",
    account_number: "712-2-98421-0",
    account_name: "Carmen Hotel Co., Ltd.",
    branch_name: "Silom Complex",
    gl_account_id: "1112-01",
    currency_code: "THB",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "bank-scb-01",
    bank_name: "Siam Commercial Bank (SCB)",
    account_number: "045-3-11982-4",
    account_name: "Carmen Hotel Co., Ltd.",
    branch_name: "Thonglor",
    gl_account_id: "1112-02",
    currency_code: "THB",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "bank-bbl-01",
    bank_name: "Bangkok Bank (BBL)",
    account_number: "101-7-89234-1",
    account_name: "Carmen Hotel Co., Ltd.",
    branch_name: "Sathorn",
    gl_account_id: "1112-03",
    currency_code: "THB",
    is_active: true,
    doc_version: 0,
  },
];

export const DEFAULT_PAYMENT_TYPES: PaymentTypeMaster[] = [
  {
    id: "pm-transfer",
    code: "TRANSFER",
    description: "Bank Transfer",
    description_local: "โอนเงินผ่านธนาคาร",
    payment_method: "transfer",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "pm-cheque",
    code: "CHEQUE",
    description: "Bank Cheque",
    description_local: "เช็คธนาคาร",
    payment_method: "cheque",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "pm-cash",
    code: "CASH",
    description: "Petty Cash / Cash on Hand",
    description_local: "เงินสดย่อย / เงินสดในมือ",
    payment_method: "cash",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "pm-direct-debit",
    code: "DIRECT_DEBIT",
    description: "Direct Debit",
    description_local: "หักบัญชีเงินฝากอัตโนมัติ",
    payment_method: "direct_debit",
    is_active: true,
    doc_version: 0,
  },
];

export const DEFAULT_WHT_FORMS: WhtFormMaster[] = [
  {
    id: "wht-form-pnd3",
    code: "PND3",
    description: "ภ.ง.ด. 3 (บุคคลธรรมดา)",
    gl_account_id: "2012005",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "wht-form-pnd53",
    code: "PND53",
    description: "ภ.ง.ด. 53 (นิติบุคคล)",
    gl_account_id: "2012006",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "wht-form-pnd2",
    code: "PND2",
    description: "ภ.ง.ด. 2 (ค่าเช่าและบริการบุคคลธรรมดา)",
    gl_account_id: "2012004",
    is_active: true,
    doc_version: 0,
  },
];

export const DEFAULT_WHT_SERVICE_TYPES: WhtServiceTypeMaster[] = [
  {
    id: "wht-service-3",
    code: "WHT-SVC",
    description: "Service Fee (ค่าจ้างบริการ/ทำของ)",
    default_rate: "3.00",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "wht-rent-5",
    code: "WHT-RENT",
    description: "Rental Fee (ค่าเช่าทรัพย์สิน)",
    default_rate: "5.00",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "wht-transport-1",
    code: "WHT-TRANS",
    description: "Transportation (ค่าขนส่ง)",
    default_rate: "1.00",
    is_active: true,
    doc_version: 0,
  },
  {
    id: "wht-advertising-2",
    code: "WHT-ADV",
    description: "Advertising (ค่าโฆษณา)",
    default_rate: "2.00",
    is_active: true,
    doc_version: 0,
  },
];

export const DEFAULT_TITLES: TitleMaster[] = [
  {
    id: "title-mr",
    code: "MR",
    description: "Mr.",
    is_active: true,
    is_system: true,
    reference_count: 18,
  },
  {
    id: "title-mrs",
    code: "MRS",
    description: "Mrs.",
    is_active: true,
    is_system: true,
    reference_count: 9,
  },
  {
    id: "title-ms",
    code: "MS",
    description: "Ms.",
    is_active: true,
    is_system: true,
    reference_count: 5,
  },
  {
    id: "title-dr",
    code: "DR",
    description: "Dr.",
    is_active: true,
    is_system: false,
    reference_count: 2,
  },
  {
    id: "title-khun",
    code: "KHUN",
    description: "Khun",
    is_active: true,
    is_system: false,
    reference_count: 12,
  },
];

export function useBankAccounts() {
  const buCode = useBuCode();
  return useQuery({
    queryKey: ["accounting-master", "bank-accounts", buCode],
    queryFn: async (): Promise<BankAccountMaster[]> => {
      if (!buCode) return DEFAULT_BANK_ACCOUNTS;
      try {
        const res = await httpClient.get(API_ENDPOINTS.GL_BANK_ACCOUNTS(buCode));
        if (!res.ok) return DEFAULT_BANK_ACCOUNTS;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        return items.length > 0 ? items : DEFAULT_BANK_ACCOUNTS;
      } catch {
        return DEFAULT_BANK_ACCOUNTS;
      }
    },
    initialData: DEFAULT_BANK_ACCOUNTS,
  });
}

export function usePaymentTypes() {
  return useQuery({
    queryKey: ["accounting-master", "payment-types"],
    queryFn: async (): Promise<PaymentTypeMaster[]> => {
      return DEFAULT_PAYMENT_TYPES;
    },
    initialData: DEFAULT_PAYMENT_TYPES,
  });
}

export function useWhtForms() {
  return useQuery({
    queryKey: ["accounting-master", "wht-forms"],
    queryFn: async (): Promise<WhtFormMaster[]> => {
      return DEFAULT_WHT_FORMS;
    },
    initialData: DEFAULT_WHT_FORMS,
  });
}

export function useWhtServiceTypes() {
  return useQuery({
    queryKey: ["accounting-master", "wht-service-types"],
    queryFn: async (): Promise<WhtServiceTypeMaster[]> => {
      return DEFAULT_WHT_SERVICE_TYPES;
    },
    initialData: DEFAULT_WHT_SERVICE_TYPES,
  });
}

export function useTitles() {
  const buCode = useBuCode();
  return useQuery({
    queryKey: ["accounting-master", "titles", buCode],
    queryFn: async (): Promise<TitleMaster[]> => {
      if (!buCode) return DEFAULT_TITLES;
      try {
        const res = await httpClient.get(`/api/proxy/api/config/${buCode}/titles`);
        if (!res.ok) return DEFAULT_TITLES;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        return items.length > 0 ? items : DEFAULT_TITLES;
      } catch {
        return DEFAULT_TITLES;
      }
    },
    initialData: DEFAULT_TITLES,
  });
}

export const DEFAULT_GL_PERIODS: GlPeriodMaster[] = [
  {
    id: "per-2026-01",
    fiscal_year: 2026,
    period_number: 1,
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    status: "closed",
    doc_version: 0,
  },
  {
    id: "per-2026-02",
    fiscal_year: 2026,
    period_number: 2,
    start_date: "2026-02-01",
    end_date: "2026-02-28",
    status: "closed",
    doc_version: 0,
  },
  {
    id: "per-2026-03",
    fiscal_year: 2026,
    period_number: 3,
    start_date: "2026-03-01",
    end_date: "2026-03-31",
    status: "open",
    doc_version: 0,
  },
  {
    id: "per-2026-04",
    fiscal_year: 2026,
    period_number: 4,
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    status: "open",
    doc_version: 0,
  },
  {
    id: "per-2026-09",
    fiscal_year: 2026,
    period_number: 9,
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "open",
    doc_version: 0,
  },
];

export function useGlPeriods() {
  const buCode = useBuCode();
  return useQuery({
    queryKey: ["accounting-master", "gl-periods", buCode],
    queryFn: async (): Promise<GlPeriodMaster[]> => {
      if (!buCode) return DEFAULT_GL_PERIODS;
      try {
        const res = await httpClient.get(API_ENDPOINTS.GL_PERIODS(buCode));
        if (!res.ok) return DEFAULT_GL_PERIODS;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        return items.length > 0 ? items : DEFAULT_GL_PERIODS;
      } catch {
        return DEFAULT_GL_PERIODS;
      }
    },
    initialData: DEFAULT_GL_PERIODS,
  });
}
