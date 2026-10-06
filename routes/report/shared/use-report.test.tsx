import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

/**
 * รายการตัวเลือกของรายงานต้องดึงใหม่ทุกครั้งที่เปิด dialog
 *
 * เดิม cache 30 นาที — มีคนเพิ่มสินค้าใหม่ คนที่เปิดหน้ารายงานค้างไว้เปิด dialog
 * กี่ครั้งก็ไม่เจอสินค้าตัวนั้น (dialog mount ค้างไว้ query key ไม่เปลี่ยน)
 */

vi.mock("@/hooks/use-bu-code", () => ({ useBuCode: () => "BU1" }));

const { useReportListLookups } = await import("./use-report");

const lookupResponse = (products: string[]) =>
  new Response(
    JSON.stringify({
      data: { product: products.map((code) => ({ code, name: code })) },
    }),
    { status: 200 },
  );

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const productCodes = (
  data: ReturnType<typeof useReportListLookups>["data"],
) => data?.data.product?.map((p) => p.code);

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-test" });
});

describe("useReportListLookups", () => {
  it("fetches nothing while the dialog is closed", () => {
    const fetchMock = vi.fn(async () => lookupResponse(["P1"]));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(
      () => useReportListLookups({ sources: ["product"], enabled: false }),
      { wrapper },
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refetches on every open, so a product added meanwhile shows up", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(lookupResponse(["P1"]))
      // มีคนเพิ่ม P2 ระหว่างที่ dialog ปิดอยู่
      .mockResolvedValueOnce(lookupResponse(["P1", "P2"]));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useReportListLookups({ sources: ["product"], enabled: open }),
      { wrapper, initialProps: { open: true } },
    );
    await waitFor(() => expect(productCodes(result.current.data)).toEqual(["P1"]));

    rerender({ open: false });
    rerender({ open: true });

    await waitFor(() =>
      expect(productCodes(result.current.data)).toEqual(["P1", "P2"]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
