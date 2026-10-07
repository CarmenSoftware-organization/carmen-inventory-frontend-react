import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import type { Report } from "@/types/report";

/**
 * กดเปิดช่องเลือกที่ดึงข้อมูลจากที่อื่น ต้องดึงรายการใหม่ทุกครั้ง
 *
 * dialog ดึงรอบแรกตอนเปิดอยู่แล้ว แต่ผู้ใช้เปิด dialog ค้างไว้ได้ — มีคนเพิ่มสินค้า
 * ระหว่างนั้น กดช่อง Product กี่ครั้งก็ต้องเห็นตัวใหม่ ไม่ใช่รายการตอนเปิด dialog
 */

vi.mock("@/hooks/use-bu-code", () => ({ useBuCode: () => "BU1" }));

const { ReportParamDialog } = await import("./report-param-dialog");

const report = {
  Id: 1,
  ReportName: "Stock Card",
  Dialog:
    '<Dialog><Label Text="Product"/><Lookup Name="Product" DataSource="@product_list"/></Dialog>',
} as unknown as Report;

const lookupResponse = () =>
  new Response(
    JSON.stringify({ data: { product: [{ code: "P1", name: "Product 1" }] } }),
    { status: 200 },
  );

const lookupCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes("/lookups"))
    .length;

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <ReportParamDialog open onOpenChange={() => {}} report={report} />
      </IntlProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-test" });
});

describe("ReportParamDialog lookup fields", () => {
  it("refetches the list every time a lookup field is opened", async () => {
    const fetchMock = vi.fn(async () => lookupResponse());
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderDialog();
    // รอบแรก: ตอนเปิด dialog (ช่องเลือกโผล่หลังได้รายการ — ค่าเริ่มต้นคือ All)
    const trigger = await screen.findByRole("button", { name: "All" });
    expect(lookupCalls(fetchMock)).toBe(1);

    await user.click(trigger);
    await waitFor(() => expect(lookupCalls(fetchMock)).toBe(2));

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() => expect(lookupCalls(fetchMock)).toBe(3));
  });
});
