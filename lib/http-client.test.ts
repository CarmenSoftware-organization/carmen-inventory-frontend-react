import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { httpClient } from "./http-client";
import { ApiError } from "./api-error";
import { tokenStore } from "@/lib/auth/token-store";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

vi.mock("@/lib/auth/auth-api", () => ({ refreshTokens: vi.fn() }));

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
  tokenStore.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * สร้าง Response object แบบ JSON สำหรับ mock fetch response ในเทส httpClient
 *
 * @param status - HTTP status code
 * @param body - ข้อมูล body ที่จะถูก stringify (default: {})
 * @returns Response instance พร้อม header Content-Type เป็น application/json
 */
function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// =========================================================================
// HTTP methods
// =========================================================================
describe("httpClient.get", () => {
  it("sends GET request with correct URL", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await httpClient.get("/api/proxy/test");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/test",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.status).toBe(200);
  });
});

describe("httpClient.post", () => {
  it("sends POST with JSON body and Content-Type header", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(201));
    vi.stubGlobal("fetch", fetchMock);
    await httpClient.post("/api/proxy/items", { name: "test" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ name: "test" });
  });

  it("sends POST without body when body is undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    await httpClient.post("/api/proxy/trigger");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });
});

describe("httpClient.put", () => {
  it("sends PUT request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    await httpClient.put("/api/proxy/items/1", { name: "updated" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
  });
});

describe("httpClient.patch", () => {
  it("sends PATCH request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    await httpClient.patch("/api/proxy/items/1", { name: "patched" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
  });
});

describe("httpClient.delete", () => {
  it("sends DELETE request without body", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await httpClient.delete("/api/proxy/items/1");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });
});

// =========================================================================
// FormData handling — must not stringify or set Content-Type
// =========================================================================
describe("FormData handling", () => {
  it("does not JSON.stringify FormData nor set Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    const form = new FormData();
    form.append("file", "x");
    await httpClient.post("/api/proxy/upload", form);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });
});

// =========================================================================
// 403 handling
// =========================================================================
describe("403 handling", () => {
  it("throws ApiError with FORBIDDEN code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(403)));
    try {
      await httpClient.get("/api/proxy/admin");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("FORBIDDEN");
      expect((err as ApiError).statusCode).toBe(403);
    }
  });
});

// =========================================================================
// External public endpoints — auth interception is skipped
// =========================================================================
describe("/api/external/* handling", () => {
  it("returns the raw 401 response instead of throwing/refreshing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(401));
    vi.stubGlobal("fetch", fetchMock);
    const res = await httpClient.get("/api/external/pl/tok-123");
    // ไม่ throw ApiError และไม่เรียก refresh/retry — คืน response ดิบให้ hook จัดการ
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// 429 handling
// =========================================================================
describe("429 handling", () => {
  it("throws ApiError with RATE_LIMITED code and retryable=true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(429)));
    try {
      await httpClient.get("/api/proxy/data");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("RATE_LIMITED");
      expect((err as ApiError).statusCode).toBe(429);
      expect((err as ApiError).retryable).toBe(true);
    }
  });
});

// =========================================================================
// Error normalization — network errors become ApiError
// =========================================================================
describe("error normalization", () => {
  it("converts a network failure into a NETWORK_ERROR ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")));
    try {
      await httpClient.get("/api/proxy/data");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("NETWORK_ERROR");
      expect((err as ApiError).retryable).toBe(true);
    }
  });

  it("converts an AbortError into a TIMEOUT ApiError", async () => {
    const abort = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(abort));
    try {
      await httpClient.get("/api/proxy/data");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("TIMEOUT");
    }
  });
});

// =========================================================================
// Normal responses pass through
// =========================================================================
describe("normal responses", () => {
  it("returns 200 response as-is", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(200, { data: [1, 2, 3] })));
    const res = await httpClient.get("/api/proxy/data");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([1, 2, 3]);
  });

  it("returns 404 response as-is", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(404)));
    const res = await httpClient.get("/api/proxy/missing");
    expect(res.status).toBe(404);
  });

  it("returns 500 response as-is", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(500)));
    const res = await httpClient.get("/api/proxy/error");
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// SPA URL rewrite + auth
// =========================================================================
describe("SPA URL rewrite + auth", () => {
  it("rewrites /api/proxy/* to the backend origin with bearer + x-app-id", async () => {
    tokenStore.set("at-1");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await httpClient.get("/api/proxy/api/config/HQ/units");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/config/HQ/units");
    expect(init.headers.Authorization).toBe("Bearer at-1");
    expect(init.headers["x-app-id"]).toBe("app-1");
  });

  it("retries once with the refreshed token after 401", async () => {
    tokenStore.set("expired");
    const { refreshTokens } = await import("@/lib/auth/auth-api");
    vi.mocked(refreshTokens).mockImplementation(async () => {
      tokenStore.set("fresh");
      return true;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await httpClient.get("/api/proxy/api/user/profile");

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh");
  });

  it("clears the token store when refresh fails after 401", async () => {
    tokenStore.set("expired");
    const { refreshTokens } = await import("@/lib/auth/auth-api");
    vi.mocked(refreshTokens).mockResolvedValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );

    await expect(httpClient.get("/api/proxy/api/user/profile")).rejects.toThrow(
      "Session expired",
    );
    expect(tokenStore.get()).toBeNull();
  });

  it("rejects non-/api/ URLs", async () => {
    await expect(httpClient.get("https://evil.com/x")).rejects.toThrow(
      "Invalid request URL",
    );
  });
});
