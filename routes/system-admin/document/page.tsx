import DocumentComponent from "./_components/document-component";

/**
 * หน้ารายการเอกสาร (Document) ในโมดูล System Admin
 * @returns React element ของหน้า Document
 * @example
 * // ใช้เป็น Next.js route: /system-admin/document
 * <DocumentPage />
 */
export default function DocumentPage() {
  return <DocumentComponent />;
}

export const Component = DocumentPage;
