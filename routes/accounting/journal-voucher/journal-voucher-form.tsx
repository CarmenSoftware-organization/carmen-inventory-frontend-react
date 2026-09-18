import AccountingDocumentDetail from "../documents/accounting-document-detail";

/**
 * Journal Voucher deliberately reuses the Template Voucher detail shell.
 * JV-specific source/capability behavior is resolved inside AccountingDocumentDetail.
 */
export default function JournalVoucherForm() {
  return <AccountingDocumentDetail />;
}
