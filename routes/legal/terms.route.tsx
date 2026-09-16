import { useLegalDocument } from "./legal-content";
import { LegalPage } from "./legal-page";
import { TERMS_DOCUMENT } from "./terms-content";

export function Component() {
  return (
    <LegalPage document={useLegalDocument(TERMS_DOCUMENT)} crossTo="/privacy" />
  );
}
