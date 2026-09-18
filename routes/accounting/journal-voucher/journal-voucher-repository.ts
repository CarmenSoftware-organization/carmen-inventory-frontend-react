import type { PaginatedResponse, ParamsDto } from "@/types/params";
import type {
  JournalVoucher,
  JournalVoucherAction,
  JournalVoucherInput,
} from "@/types/journal-voucher";

export interface JournalVoucherSettings {
  workflow_enabled: boolean;
  journal_staging_mode: "standard" | "strict";
}

export type JournalVoucherCommand =
  | "submit"
  | "approve"
  | "reject"
  | "return-to-draft"
  | "retry-post"
  | "reschedule"
  | "reverse"
  | "void";

export interface JournalVoucherRepository {
  list(
    buCode: string,
    params?: ParamsDto,
  ): Promise<PaginatedResponse<JournalVoucher>>;
  get(buCode: string, id: string): Promise<JournalVoucher | null>;
  settings(buCode: string): Promise<JournalVoucherSettings>;
  create(buCode: string, input: JournalVoucherInput): Promise<JournalVoucher>;
  update(
    buCode: string,
    id: string,
    docVersion: number,
    input: JournalVoucherInput,
  ): Promise<JournalVoucher>;
  action(
    buCode: string,
    id: string,
    action: JournalVoucherCommand,
    input: JournalVoucherAction,
  ): Promise<JournalVoucher>;
  copy(buCode: string, id: string): Promise<JournalVoucher>;
}
