import { useLegalDocument } from "./legal-content";
import { LegalPage } from "./legal-page";
import { PRIVACY_DOCUMENT } from "./privacy-content";

/** หน้า `/privacy` — public เช่นเดียวกับ `/terms` */
export function Component() {
  return (
    <LegalPage document={useLegalDocument(PRIVACY_DOCUMENT)} crossTo="/terms" />
  );
}
