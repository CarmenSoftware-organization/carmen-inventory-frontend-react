import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { ApiError } from "@/lib/api-error";
import type { ParamsDto, PaginatedResponse } from "@/types/params";

interface ConfigApiOptions {
  endpoint: (buCode: string) => string;
  label: string;
  updateMethod?: "PUT" | "PATCH";
}

/**
 * Factory สำหรับสร้างชุด CRUD API functions ของ config module
 *
 * คืน object ที่มี getList, getById, create, update, remove
 * ทุก function ต้องการ buCode เป็น argument แรก
 *
 * @param options - การตั้งค่า endpoint, label, และ HTTP method สำหรับ update
 * @returns object ที่มี CRUD functions ครบชุด
 * @example
 * ```ts
 * const api = createConfigApi<Vendor, CreateVendorDto>({
 *   endpoint: (bu) => `/api/proxy/${bu}/vendors`,
 *   label: "vendor",
 *   updateMethod: "PATCH",
 * });
 * const list = await api.getList("BU001", { page: 1 });
 * ```
 */
export function createConfigApi<T, TCreate>({
  endpoint,
  label,
  updateMethod = "PUT",
}: ConfigApiOptions) {
  const methodMap = { PUT: "put", PATCH: "patch" } as const;
  const httpMethod = methodMap[updateMethod];

  async function getList(
    buCode: string,
    params?: ParamsDto,
  ): Promise<PaginatedResponse<T>> {
    const url = buildUrl(endpoint(buCode), params);
    const res = await httpClient.get(url);
    if (!res.ok) throw await ApiError.from(res, `Failed to fetch ${label}`);
    return res.json();
  }

  async function getById(buCode: string, id: string): Promise<T> {
    const res = await httpClient.get(`${endpoint(buCode)}/${id}`);
    if (!res.ok) throw await ApiError.from(res, `Failed to fetch ${label}`);
    const json = await res.json();
    return json.data;
  }

  async function create(buCode: string, data: TCreate): Promise<Response> {
    return httpClient.post(endpoint(buCode), data);
  }

  async function update(
    buCode: string,
    id: string,
    data: TCreate,
  ): Promise<Response> {
    return httpClient[httpMethod](`${endpoint(buCode)}/${id}`, data);
  }

  async function remove(buCode: string, id: string): Promise<Response> {
    return httpClient.delete(`${endpoint(buCode)}/${id}`);
  }

  return { getList, getById, create, update, remove };
}
