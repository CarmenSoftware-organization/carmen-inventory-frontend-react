import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { safeNavigationHref } from "@/lib/utils";

/**
 * เปิด viewer URL ที่ได้จาก response ของ backend
 *
 * กรอง `javascript:` / `data:` ทิ้งด้วย `safeNavigationHref` ก่อนเสมอ ไม่ใช่เพราะไม่เชื่อ
 * backend แต่เพราะ URL ก้อนนี้ประกอบมาจากค่าที่ผู้ใช้กรอก (ชื่อไฟล์ · template) และมันไป
 * จบที่ `window.open`/`location.href` ตรง ๆ — ถ้าหลุดมาได้แม้ครั้งเดียวคือ XSS ที่ผู้ใช้
 * เป็นคนกดเอง ราคาของการกรองคือโค้ดสามบรรทัด
 */
function openViewerUrl(url: string, target: "_blank" | "self" | null): void {
  const safe = safeNavigationHref(url);
  if (!safe) throw new Error(`Viewer returned an unsafe URL: ${url}`);
  if (target === "_blank") window.open(safe, "_blank", "noopener,noreferrer");
  else if (target === "self") window.location.href = safe;
}

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
  documentId?: string;
  filters?: Record<string, unknown>;
  target?: "_blank" | "self" | null;
  templateId?: string;
}

/**
 * Document-specific print endpoints that already build the full data
 * payload server-side. When the doc type is in this map and documentId
 * is supplied, we use this path instead of the generic resolve+viewer.
 *
 * EOP is the only type still missing on purpose — it has no dedicated
 * endpoint and no report-template row, so it is configurable, not printable.
 * (SI and SO were in that state until the backend grew
 * `stock-{ins,outs}/:id/print-viewer` plus their SI/SO form templates.)
 */
const DEDICATED_PRINT_ENDPOINTS: Partial<
  Record<PrintDocumentType, (buCode: string, id: string) => string>
> = {
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
  SI: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/stock-ins/${encodeURIComponent(id)}/print-viewer`,
  SO: (bu, id) =>
    `/api/proxy/api/${encodeURIComponent(bu)}/stock-outs/${encodeURIComponent(id)}/print-viewer`,
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
    const json: { data?: { viewer_url?: string }; viewer_url?: string } =
      await res.json();
    const viewerUrl = json.data?.viewer_url ?? json.viewer_url;
    if (!viewerUrl) {
      throw new Error(
        `Print endpoint returned no viewer_url for ${documentType}`,
      );
    }
    const target = options.target === undefined ? "_blank" : options.target;
    openViewerUrl(viewerUrl, target);
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
  openViewerUrl(url, target);

  return {
    url,
    templateId: options.templateId,
    templateName: null,
  };
}
