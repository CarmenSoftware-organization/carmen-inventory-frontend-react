import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { ApiError } from "@/lib/api-error";

vi.mock("@/hooks/use-bu-code", () => ({
  useBuCode: vi.fn(() => "BU001"),
}));

import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "../use-api-mutation";

/**
 * สร้าง Response แบบ JSON สำหรับ mock httpClient ในเทสต์
 * @param status - HTTP status code
 * @param body - ข้อมูล body ที่จะ serialize เป็น JSON
 * @returns Response object พร้อม Content-Type: application/json
 */
function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * สร้าง React wrapper สำหรับทดสอบ hook โดยให้ QueryClientProvider ใหม่ต่อการทดสอบ 1 ครั้ง
 * โดยปิด retry ของ query/mutation เพื่อไม่ให้เทสต์รอโดยไม่จำเป็น
 * @returns Wrapper component สำหรับใช้กับ renderHook
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useBuCode).mockReturnValue("BU001");
});

describe("useApiMutation", () => {
  it("calls mutationFn with variables and buCode", async () => {
    const mutationFn = vi.fn().mockResolvedValue(jsonRes(200, { id: "1" }));

    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate({ name: "test" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledWith({ name: "test" }, "BU001");
  });

  it("throws ApiError when buCode is missing", async () => {
    vi.mocked(useBuCode).mockReturnValue(undefined as unknown as string);
    const mutationFn = vi.fn();

    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate("data");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("MISSING_REQUIRED_FIELD");
    expect(mutationFn).not.toHaveBeenCalled();
  });

  it("throws ApiError with server message on non-ok response", async () => {
    const mutationFn = vi.fn().mockResolvedValue(
      jsonRes(400, { message: "Name already exists" }),
    );

    const { result } = renderHook(
      () => useApiMutation({ mutationFn, errorMessage: "Create failed" }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate({ name: "dup" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Name already exists");
  });

  it("uses fallback errorMessage when server response has no message", async () => {
    const mutationFn = vi.fn().mockResolvedValue(
      new Response("not json", { status: 500 }),
    );

    const { result } = renderHook(
      () => useApiMutation({ mutationFn, errorMessage: "Something went wrong" }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate("data");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Something went wrong");
  });

  it("throws ApiError when response body has success: false", async () => {
    const mutationFn = vi.fn().mockResolvedValue(
      jsonRes(200, { success: false, message: "Validation failed", status: 422 }),
    );

    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate("data");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("VALIDATION_ERROR");
    expect(result.current.error?.message).toBe("Validation failed");
  });

  it("invalidates query keys on success", async () => {
    const mutationFn = vi.fn().mockResolvedValue(jsonRes(200, { ok: true }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function TestWrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(
      () => useApiMutation({
        mutationFn,
        invalidateKeys: ["items", "categories"],
      }),
      { wrapper: TestWrapper },
    );

    act(() => {
      result.current.mutate("data");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["items"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["categories"] });
  });

  it("returns parsed data on success", async () => {
    const mutationFn = vi.fn().mockResolvedValue(
      jsonRes(200, { id: "1", name: "Created" }),
    );

    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate({ name: "test" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "1", name: "Created" });
  });

  it("defaults errorMessage to 'Request failed'", async () => {
    const mutationFn = vi.fn().mockResolvedValue(
      new Response("error", { status: 500 }),
    );

    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate("data");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Request failed");
  });
});
