import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api-error";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { httpClient } from "@/lib/http-client";
import { createConfigApi } from "../config-crud";

interface Item {
  id: string;
  name: string;
}
interface CreateItem {
  name: string;
}

const endpoint = (buCode: string) => `/api/proxy/api/config/${buCode}/items`;

/**
 * สร้าง config CRUD API instance สำหรับใช้ในเทส
 *
 * @param updateMethod - HTTP method สำหรับ update (PUT หรือ PATCH), ไม่ระบุจะใช้ค่า default
 * @returns config API instance ที่มี method สำหรับ getList, getById, create, update, remove
 */
function createApi(updateMethod?: "PUT" | "PATCH") {
  return createConfigApi<Item, CreateItem>({
    endpoint,
    label: "item",
    updateMethod,
  });
}

/**
 * สร้าง Response object แบบ JSON สำหรับ mock fetch response
 *
 * @param status - HTTP status code
 * @param body - ข้อมูล body ที่จะถูก stringify เป็น JSON
 * @returns Response instance พร้อม header Content-Type เป็น application/json
 */
function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =========================================================================
// getList
// =========================================================================
describe("getList", () => {
  it("fetches list successfully", async () => {
    const data = { data: [{ id: "1", name: "A" }], paginate: { total: 1, page: 1, perpage: 10, pages: 1 } };
    vi.mocked(httpClient.get).mockResolvedValue(jsonRes(200, data));

    const api = createApi();
    const result = await api.getList("BU001");

    expect(httpClient.get).toHaveBeenCalledWith("/api/proxy/api/config/BU001/items");
    expect(result.data).toHaveLength(1);
    expect(result.paginate.total).toBe(1);
  });

  it("passes query params via buildUrl", async () => {
    const data = { data: [], paginate: { total: 0, page: 1, perpage: 10, pages: 0 } };
    vi.mocked(httpClient.get).mockResolvedValue(jsonRes(200, data));

    const api = createApi();
    await api.getList("BU001", { search: "test", page: 2 });

    const url = vi.mocked(httpClient.get).mock.calls[0][0];
    expect(url).toContain("search=test");
    expect(url).toContain("page=2");
  });

  it("throws ApiError on non-ok response", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(jsonRes(500, {}));

    const api = createApi();
    await expect(api.getList("BU001")).rejects.toThrow(ApiError);
  });

  it("includes label in error message", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(jsonRes(404, {}));

    const api = createApi();
    await expect(api.getList("BU001")).rejects.toThrow("Failed to fetch item");
  });

  it("sets correct error code from status", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(jsonRes(401, {}));

    const api = createApi();
    try {
      await api.getList("BU001");
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("UNAUTHORIZED");
    }
  });
});

// =========================================================================
// getById
// =========================================================================
describe("getById", () => {
  it("fetches single record successfully", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      jsonRes(200, { data: { id: "1", name: "A" } }),
    );

    const api = createApi();
    const result = await api.getById("BU001", "1");

    expect(httpClient.get).toHaveBeenCalledWith("/api/proxy/api/config/BU001/items/1");
    expect(result).toEqual({ id: "1", name: "A" });
  });

  it("throws ApiError with label on failure", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(jsonRes(404, {}));

    const api = createApi();
    await expect(api.getById("BU001", "999")).rejects.toThrow("Failed to fetch item");
  });
});

// =========================================================================
// create
// =========================================================================
describe("create", () => {
  it("posts to correct endpoint", async () => {
    const mockRes = jsonRes(201, { id: "3" });
    vi.mocked(httpClient.post).mockResolvedValue(mockRes);

    const api = createApi();
    const res = await api.create("BU001", { name: "New" });

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/proxy/api/config/BU001/items",
      { name: "New" },
    );
    expect(res.status).toBe(201);
  });
});

// =========================================================================
// update
// =========================================================================
describe("update", () => {
  it("uses PUT by default", async () => {
    vi.mocked(httpClient.put).mockResolvedValue(jsonRes(200, {}));

    const api = createApi();
    await api.update("BU001", "1", { name: "Updated" });

    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/proxy/api/config/BU001/items/1",
      { name: "Updated" },
    );
  });

  it("uses PATCH when configured", async () => {
    vi.mocked(httpClient.patch).mockResolvedValue(jsonRes(200, {}));

    const api = createApi("PATCH");
    await api.update("BU001", "1", { name: "Patched" });

    expect(httpClient.patch).toHaveBeenCalledWith(
      "/api/proxy/api/config/BU001/items/1",
      { name: "Patched" },
    );
    expect(httpClient.put).not.toHaveBeenCalled();
  });
});

// =========================================================================
// remove
// =========================================================================
describe("remove", () => {
  it("deletes at correct endpoint", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(jsonRes(200, {}));

    const api = createApi();
    await api.remove("BU001", "1");

    expect(httpClient.delete).toHaveBeenCalledWith(
      "/api/proxy/api/config/BU001/items/1",
    );
  });
});
