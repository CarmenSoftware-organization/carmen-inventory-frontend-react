import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";

/**
 * Safely read an error response body and format it as a ": <detail>" suffix
 * (truncated to 200 chars), or "" when the body is empty/unreadable.
 */
async function errorSuffix(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return body ? `: ${body.slice(0, 200)}` : "";
}

export type PrintDocumentType =
  | "PR"
  | "PO"
  | "GRN"
  | "SR"
  | "CN"
  | "IA"
  | "PC"
  | "SC"
  | "RFQ"
  | "INV";

export interface PrintMappingResponse {
  data?: {
    id: string;
    document_type: string;
    report_template_id: string;
    template_name?: string | null;
  };
}

export interface ViewerResponse {
  data?: { url: string };
  url?: string;
}

export interface PrintDocumentOptions {
  /**
   * Document UUID — preferred when present. When set, we hit the
   * document-specific print endpoint that builds full data payload
   * (header + details + signatures) — currently wired for PR.
   */
  documentId?: string;
  /**
   * Filters passed to the generic report viewer. Use the param names
   * declared in the print template's source view/function
   * (e.g. {DocumentNo: "PR-2024-001"}). Used as a fallback when
   * documentId isn't available or the doc type doesn't have a dedicated
   * print endpoint yet.
   */
  filters?: Record<string, unknown>;
  /**
   * Where to open the resulting viewer URL. Defaults to a new tab.
   * Set to "self" to navigate the current tab; pass null to suppress the
   * window.open call entirely (caller handles the URL).
   */
  target?: "_blank" | "self" | null;
}

/**
 * Document-specific print endpoints that already build the full data
 * payload server-side. When the doc type is in this map and documentId
 * is supplied, we use this path instead of the generic resolve+viewer.
 */
const DEDICATED_PRINT_ENDPOINTS: Partial<Record<PrintDocumentType, (buCode: string, id: string) => string>> = {
  PR: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/purchase-requests/${encodeURIComponent(id)}/print-viewer`,
  PO: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/purchase-orders/${encodeURIComponent(id)}/print-viewer`,
  GRN: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/good-received-notes/${encodeURIComponent(id)}/print-viewer`,
  SR: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/store-requisitions/${encodeURIComponent(id)}/print-viewer`,
  CN: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/credit-notes/${encodeURIComponent(id)}/print-viewer`,
  IA: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/inventory-adjustments/${encodeURIComponent(id)}/print-viewer`,
  PC: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/physical-counts/${encodeURIComponent(id)}/print-viewer`,
  SC: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/spot-checks/${encodeURIComponent(id)}/print-viewer`,
  RFQ: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/request-for-pricings/${encodeURIComponent(id)}/print-viewer`,
  INV: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/invoice/${encodeURIComponent(id)}/print-viewer`,
};

export interface PrintDocumentResult {
  url: string;
  templateId: string;
  templateName: string | null;
}

/**
 * Resolve which print template applies for (documentType, buCode) and ask the
 * report-viewer endpoint to render it. Returns the viewer URL and (by
 * default) opens it in a new tab.
 *
 * Two HTTP round-trips:
 *   1. GET /api/{bu}/report/print-template?document_type=PR → template_id
 *   2. POST /api/{bu}/report/viewer { template_id, filters }   → viewer URL
 *
 * Throws Error on any failure; callers should toast/log it.
 */
export async function printDocument(
  buCode: string,
  documentType: PrintDocumentType,
  options: PrintDocumentOptions = {},
): Promise<PrintDocumentResult> {
  if (!buCode) throw new Error("buCode is required");
  if (!documentType) throw new Error("documentType is required");

  // Path 1 — dedicated endpoint that already builds full data payload.
  const dedicated = DEDICATED_PRINT_ENDPOINTS[documentType];
  if (dedicated && options.documentId) {
    const url = dedicated(buCode, options.documentId);
    const res = await httpClient.get(url);
    if (!res.ok) {
      throw new Error(
        `Print failed for ${documentType} (${res.status})${await errorSuffix(res)}`,
      );
    }
    const json: { data?: { viewer_url?: string }; viewer_url?: string } = await res.json();
    const viewerUrl = json.data?.viewer_url ?? json.viewer_url;
    if (!viewerUrl) {
      throw new Error(`Print endpoint returned no viewer_url for ${documentType}`);
    }
    const target = options.target === undefined ? "_blank" : options.target;
    if (target === "_blank") window.open(viewerUrl, "_blank", "noopener,noreferrer");
    else if (target === "self") window.location.href = viewerUrl;
    return { url: viewerUrl, templateId: "", templateName: null };
  }

  // Path 2 — generic resolve + viewer (no per-doc data builder).
  // 1. Resolve the active mapping for this doc type + BU.
  const resolveUrl = `${API_ENDPOINTS.REPORTS(buCode)}/print-template?document_type=${encodeURIComponent(documentType)}`;
  const mappingRes = await httpClient.get(resolveUrl);
  if (!mappingRes.ok) {
    throw new Error(
      `No print template configured for ${documentType} (${mappingRes.status})${await errorSuffix(mappingRes)}`,
    );
  }
  const mappingJson: PrintMappingResponse = await mappingRes.json();
  const mapping = mappingJson.data ?? (mappingJson as PrintMappingResponse["data"]);
  if (!mapping?.report_template_id) {
    throw new Error(`No print template configured for ${documentType}`);
  }

  // 2. Ask the viewer to render that template with the document filters.
  const viewerUrl = `${API_ENDPOINTS.REPORTS(buCode)}/viewer`;
  const viewerRes = await httpClient.post(viewerUrl, {
    template_id: mapping.report_template_id,
    filters: options.filters ?? {},
  });
  if (!viewerRes.ok) {
    throw new Error(
      `Render failed for ${documentType} (${viewerRes.status})${await errorSuffix(viewerRes)}`,
    );
  }
  const viewerJson: ViewerResponse = await viewerRes.json();
  const url = viewerJson.url ?? viewerJson.data?.url;
  if (!url) {
    throw new Error(`Viewer endpoint returned no URL for ${documentType}`);
  }

  // 3. Open or hand back.
  const target = options.target === undefined ? "_blank" : options.target;
  if (target === "_blank") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else if (target === "self") {
    window.location.href = url;
  }

  return {
    url,
    templateId: mapping.report_template_id,
    templateName: mapping.template_name ?? null,
  };
}
