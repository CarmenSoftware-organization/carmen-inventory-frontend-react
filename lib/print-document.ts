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
  | "SI"
  | "SO"
  | "IA"
  | "PC"
  | "SC"
  | "RFP"
  | "EOP";

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
  /**
   * Report template to render with. Normally supplied by usePrintDocument()
   * from the BU's print-form config; pass it explicitly to override. Optional
   * for Path 1 (the dedicated endpoint already knows its own template).
   * Required for Path 2 (the generic viewer) — there is no server-side
   * default mapping to fall back on; omitting it throws.
   */
  templateId?: string;
}

/**
 * Document-specific print endpoints that already build the full data
 * payload server-side. When the doc type is in this map and documentId
 * is supplied, we use this path instead of the generic resolve+viewer.
 *
 * This is a genuinely partial map by design: SI, SO and EOP deliberately
 * have no entry (and no report-template rows anywhere yet) — they are
 * configurable, not printable.
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
  RFP: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/request-for-pricings/${encodeURIComponent(id)}/print-viewer`,
};

export interface PrintDocumentResult {
  url: string;
  templateId: string;
  templateName: string | null;
}

/**
 * Print a document. Two paths:
 *
 *   1. Dedicated endpoint (documentType is in DEDICATED_PRINT_ENDPOINTS and
 *      options.documentId is supplied) — the endpoint composes the full data
 *      payload server-side and returns a ready viewer_url.
 *   2. Generic fallback (no dedicated endpoint, or no documentId) — posts
 *      options.templateId (the BU's configured print form, normally supplied
 *      by usePrintDocument()) straight to POST /api/{bu}/reports/viewer with
 *      the caller's filters. There is no server-side mapping to resolve a
 *      template anymore; the caller must already know which one to use.
 *
 *      This path renders from the template's own source view/function. Every
 *      form template in micro-report's seed has source_name: null and
 *      renders instead through a Go builder_key fed by the payload a
 *      dedicated endpoint composes — so for SI, SO and EOP (the types with no
 *      dedicated endpoint) this generic viewer path is NOT known to work
 *      today. Whether it can render a builder-backed template at all is
 *      unverified.
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
    const endpoint = dedicated(buCode, options.documentId);
    const requestUrl = options.templateId
      ? `${endpoint}?template_id=${encodeURIComponent(options.templateId)}`
      : endpoint;
    const res = await httpClient.get(requestUrl);
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

  // Path 2 — no dedicated endpoint for this type. The template comes from the
  // BU's print-form config; there is no server-side mapping to fall back on.
  if (!options.templateId) {
    throw new Error(`No print form configured for ${documentType}`);
  }

  const viewerUrl = `${API_ENDPOINTS.REPORTS(buCode)}/viewer`;
  const viewerRes = await httpClient.post(viewerUrl, {
    template_id: options.templateId,
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
    templateId: options.templateId,
    templateName: null,
  };
}
