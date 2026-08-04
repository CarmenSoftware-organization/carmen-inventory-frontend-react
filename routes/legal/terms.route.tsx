import { useLegalDocument } from "./legal-content";
import { LegalPage } from "./legal-page";
import { TERMS_DOCUMENT } from "./terms-content";

/** หน้า `/terms` — public, เปิดจากลิงก์ในหน้า login/register ได้โดยไม่ต้องล็อกอิน */
export function Component() {
  return (
    <LegalPage document={useLegalDocument(TERMS_DOCUMENT)} crossTo="/privacy" />
  );
}
