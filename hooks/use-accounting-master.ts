import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
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
      const res = await httpClient.get(API_ENDPOINTS.GL_BANK_ACCOUNTS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Failed to load bank accounts");
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json?.data ?? []);
      return items.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        code: String(item.code ?? ""),
        bank_name: String(item.bank_name ?? ""),
        account_number: String(item.account_no ?? ""),
        account_name: String(item.name ?? ""),
        branch_name: (item.bank_branch as string | null) ?? null,
        gl_account_id: (item.chart_of_accounts_id as string | null) ?? null,
        currency_code: String(item.currency_code ?? ""),
        currency_id: String(item.currency_id ?? ""),
        is_active: Boolean(item.is_active),
        doc_version: Number(item.doc_version ?? 0),
      }));
    },
    enabled: !!buCode,
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

export function useGlPeriods() {
  const buCode = useBuCode();
  return useQuery({
    queryKey: ["accounting-master", "gl-periods", buCode],
    queryFn: async (): Promise<GlPeriodMaster[]> => {
      const res = await httpClient.get(API_ENDPOINTS.GL_PERIODS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Failed to load GL periods");
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json?.data ?? []);
      return items.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        fiscal_year: Number(item.fiscal_year),
        period_number: Number(item.period_no),
        start_date: String(item.start_at).slice(0, 10),
        end_date: String(item.end_at).slice(0, 10),
        status: item.status as GlPeriodMaster["status"],
        doc_version: Number(item.doc_version ?? 0),
      }));
    },
    enabled: !!buCode,
  });
}
