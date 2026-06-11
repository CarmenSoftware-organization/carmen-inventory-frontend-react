import CreditNoteReasonComponent from "./_components/credit-note-reason-component";

/**
 * หน้ารายการ Credit Note Reason ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Credit Note Reason
 * @example
 * // route: /config/credit-note-reason
 * export default function CreditNoteReasonPage()
 */
export default function CreditNoteReasonPage() {
  return <CreditNoteReasonComponent />;
}

export const Component = CreditNoteReasonPage;
