import ArInvoiceDetail from "./ar-invoice-detail";
import { useParams, useSearchParams } from "react-router";

export function Component() {
  const { id } = useParams();
  const [params] = useSearchParams();
  return <ArInvoiceDetail key={`${id}:${params.get("copy") ?? ""}`} />;
}
