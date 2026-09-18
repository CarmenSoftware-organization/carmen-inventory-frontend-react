import AccountingDetail from "../accounting-detail";

/**
 * Journal Voucher deliberately reuses the Template Voucher detail shell.
 * JV-specific source/capability behavior is resolved inside AccountingDetail.
 */
export default function JournalVoucherForm() {
  return <AccountingDetail />;
}
