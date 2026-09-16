import { useLegalDocument } from "./legal-content";
import { LegalPage } from "./legal-page";
import { PRIVACY_DOCUMENT } from "./privacy-content";

export function Component() {
  return (
    <LegalPage document={useLegalDocument(PRIVACY_DOCUMENT)} crossTo="/terms" />
  );
}
