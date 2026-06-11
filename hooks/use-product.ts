import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_NORMAL } from "@/lib/cache-config";
import type {
  Product,
  ProductDetail,
  CreateProductDto,
} from "@/types/product";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<ProductDetail, CreateProductDto>({
  queryKey: QUERY_KEYS.PRODUCTS,
  endpoint: API_ENDPOINTS.PRODUCTS,
  label: "product",
  updateMethod: "PATCH",
  cacheProfile: CACHE_NORMAL,
});

/**
 * Hook ดึงรายการสินค้า (product) แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ product master
 * ใช้ใน `LookupProduct`, product-management > list, และหน้า PR/PO
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<ProductDetail>
 * @example
 * ```ts
 * const { data } = useProduct({ search: "flour", perpage: 20 });
 * ```
 */
export const useProduct = crud.useList;

/**
 * Hook ดึงข้อมูลสินค้าตาม id
 *
 * @param id - id ของสินค้า
 * @returns UseQueryResult ของ ProductDetail
 * @example
 * ```ts
 * const { data } = useProductById(params.id);
 * ```
 */
export const useProductById = crud.useById;

/**
 * Hook สำหรับสร้างสินค้าใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateProduct().mutate({ code: "P001", name: "Wheat Flour" });
 * ```
 */
export const useCreateProduct = crud.useCreate;

/**
 * Hook สำหรับแก้ไขข้อมูลสินค้า
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateProduct().mutate({ id, code: "P001", name: "All-Purpose Flour" });
 * ```
 */
export const useUpdateProduct = crud.useUpdate;

/**
 * Hook สำหรับลบสินค้า
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteProduct().mutate(product.id);
 * ```
 */
export const useDeleteProduct = crud.useDelete;

// --- Export ---

interface ExportProductArgs {
  params?: ParamsDto;
  columns: XlsxColumn<Product>[];
}

/**
 * Hook ส่งออก Product เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportProduct, isExporting }
 */
export function useExportProduct() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportProduct = async ({ params, columns }: ExportProductArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<Product>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.PRODUCTS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch products");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Products",
      fileNamePrefix: "product",
    });
  };

  return { exportProduct, isExporting };
}
