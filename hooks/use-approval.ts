import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { buildUrl } from "@/utils/build-query-string";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  ApprovalItem,
  ApprovalPendingSummary,
  RawApprovalPR,
  RawApprovalPO,
  RawApprovalSR,
} from "@/types/approval";
import type { ParamsDto } from "@/types/params";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * แปลงข้อมูล Purchase Request จาก backend ให้เป็น ApprovalItem มาตรฐาน
 * @param item - ข้อมูล PR ดิบจาก API
 * @returns ApprovalItem สำหรับแสดงในหน้า approval
 */
function normalizePR(item: RawApprovalPR): ApprovalItem {
  return {
    id: item.id,
    doc_type: "pr",
    doc_no: item.pr_no ?? "",
    doc_date: item.pr_date ?? "",
    description: item.description ?? "",
    status: item.pr_status ?? "",
    created_at: item.created_at ?? "",
    workflow_name: item.workflow_name ?? "",
    workflow_current_stage: item.workflow_current_stage ?? "",
    workflow_next_stage: item.workflow_next_stage ?? null,
    workflow_previous_stage: item.workflow_previous_stage ?? null,
    last_action: item.last_action ?? null,
    requestor_name: item.requestor_name ?? "",
    department_name: item.department_name ?? "",
    purchase_request_detail: item.purchase_request_detail ?? [],
    vendor_name: "",
    total_amount: 0,
    delivery_date: null,
  };
}

/**
 * แปลงข้อมูล Purchase Order จาก backend ให้เป็น ApprovalItem มาตรฐาน
 * @param item - ข้อมูล PO ดิบจาก API
 * @returns ApprovalItem สำหรับแสดงในหน้า approval
 */
function normalizePO(item: RawApprovalPO): ApprovalItem {
  return {
    id: item.id,
    doc_type: "po",
    doc_no: item.po_no ?? "",
    doc_date: item.order_date ?? "",
    description: item.description ?? "",
    status: item.po_status ?? item.status ?? "",
    created_at: item.created_at ?? "",
    workflow_name: item.workflow_name ?? "",
    workflow_current_stage: item.workflow_current_stage ?? "",
    workflow_next_stage: item.workflow_next_stage ?? null,
    workflow_previous_stage: item.workflow_previous_stage ?? null,
    last_action: item.last_action ?? null,
    requestor_name: "",
    department_name: "",
    purchase_request_detail: [],
    vendor_name: item.vendor_name ?? "",
    total_amount: item.total_amount ?? 0,
    delivery_date: item.delivery_date ?? null,
  };
}

/**
 * แปลงข้อมูล Store Requisition จาก backend ให้เป็น ApprovalItem มาตรฐาน
 * @param item - ข้อมูล SR ดิบจาก API
 * @returns ApprovalItem สำหรับแสดงในหน้า approval
 */
function normalizeSR(item: RawApprovalSR): ApprovalItem {
  return {
    id: item.id,
    doc_type: "sr",
    doc_no: item.sr_no ?? "",
    doc_date: item.sr_date ?? "",
    description: item.description ?? "",
    status: item.sr_status ?? item.status ?? "",
    created_at: item.created_at ?? "",
    workflow_name: item.workflow_name ?? "",
    workflow_current_stage: item.workflow_current_stage ?? "",
    workflow_next_stage: item.workflow_next_stage ?? null,
    workflow_previous_stage: item.workflow_previous_stage ?? null,
    last_action: item.last_action ?? null,
    requestor_name: item.requestor_name ?? "",
    department_name: item.department_name ?? "",
    purchase_request_detail: [],
    vendor_name: "",
    total_amount: 0,
    delivery_date: null,
  };
}

/**
 * ดึงข้อมูลหนึ่ง section (PR/PO/SR) จาก response และแปลงเป็น ApprovalItem
 * @param entries - array ของ entry ที่มี data และ paginate
 * @param normalize - ฟังก์ชัน normalize สำหรับ item type นั้นๆ
 * @returns object ที่มี items และ total
 */
function extractSection<T>(
  entries: { data: T[]; paginate: { total: number } }[] | undefined,
  normalize: (item: T) => ApprovalItem,
) {
  const entry = entries?.[0];
  const items: ApprovalItem[] = (entry?.data ?? []).map(normalize);
  const total: number = entry?.paginate?.total ?? 0;
  return { items, total };
}

/**
 * Filter ฝั่ง client สำหรับค้นหา ApprovalItem จากหลาย field
 * @param items - รายการ ApprovalItem ทั้งหมด
 * @param search - คำค้นหา
 * @returns รายการที่ผ่าน filter
 */
function clientFilter(items: ApprovalItem[], search: string): ApprovalItem[] {
  const term = search.toLowerCase();
  return items.filter(
    (item) =>
      item.doc_no.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.requestor_name.toLowerCase().includes(term) ||
      item.vendor_name.toLowerCase().includes(term) ||
      item.department_name.toLowerCase().includes(term),
  );
}

/**
 * Hook ดึงรายการเอกสารที่รออนุมัติ (PR/PO/SR) รวมทุกประเภทพร้อม filter ฝั่ง client
 * Normalize ข้อมูลจาก 3 section ให้เป็น ApprovalItem เดียวกัน แล้ว filter ตาม doc_type และ search ฝั่ง client
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะสถานะอนุมัติเปลี่ยนบ่อย
 * @param params - พารามิเตอร์ filter/search (filter เช่น "doc_type:pr")
 * @returns UseQueryResult ของ { data: ApprovalItem[] }
 * @example
 * const { data } = useApprovalPending({ search: "PR-2025", filter: "doc_type:pr" });
 */
export function useApprovalPending(params?: ParamsDto) {
  const buCode = useBuCode();

  return useQuery<{ data: ApprovalItem[] }>({
    queryKey: [QUERY_KEYS.APPROVAL_PENDING, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      // Strip doc_type filter — only used client-side (backend separates by section)
      const { filter: rawFilter, ...apiParams } = params ?? {};
      const url = buildUrl(API_ENDPOINTS.APPROVAL_PENDING, {
        bu_code: buCode,
        ...apiParams,
      });
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch pending approvals");
      const json = await res.json();
      const root = json.data;

      const pr = extractSection(root?.purchase_requests, normalizePR);
      const po = extractSection(root?.purchase_orders, normalizePO);
      const sr = extractSection(root?.store_requisitions, normalizeSR);

      let allItems = [...pr.items, ...po.items, ...sr.items];

      // Client-side filter by doc_type
      const docTypeFilter = rawFilter;
      if (docTypeFilter) {
        const match = docTypeFilter.match(/doc_type:(\w+)/);
        if (match) {
          allItems = allItems.filter((item) => item.doc_type === match[1]);
        }
      }

      // Client-side search filter as fallback (backend may not filter correctly)
      const search = params?.search;
      if (search) {
        allItems = clientFilter(allItems, search);
      }
      return {
        data: allItems,
      };
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงสรุปจำนวนเอกสารที่รออนุมัติแยกตามประเภท (PR/PO/SR)
 * ใช้ใน dashboard/sidebar badge แสดงจำนวนที่รอการอนุมัติ
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) ไม่ต้องมี buCode
 * @returns UseQueryResult ของ ApprovalPendingSummary
 * @example
 * const { data: summary } = useApprovalPendingSummary();
 * <Badge>{summary?.pr_total ?? 0}</Badge>
 */
export function useApprovalPendingSummary() {
  return useQuery<ApprovalPendingSummary>({
    queryKey: [QUERY_KEYS.APPROVAL_PENDING_SUMMARY],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.APPROVAL_PENDING_SUMMARY);
      if (!res.ok) throw new Error("Failed to fetch approval summary");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
  });
}
