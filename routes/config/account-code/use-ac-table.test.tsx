import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { ParamsDto } from "@/types/params";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import {
  ACCOUNT_CODE_TYPE,
  ACCOUNT_NATURE,
  type AccountCode,
} from "@/types/account-code";
import { useAcTable } from "./use-ac-table";

// useConfigTable → useCan() → useLicense() อ่าน runtime config — ไม่มีอันนี้
// จะโยน "Runtime config not loaded" ตั้งแต่ render แรก
beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-1" });
});

const params: ParamsDto = { page: 1, perpage: 10 };

const tableConfig = {
  manualPagination: true as const,
  manualSorting: true as const,
  pageCount: 0,
  state: {
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: [],
  },
  onPaginationChange: () => {},
  onSortingChange: () => {},
};

const rows: AccountCode[] = [
  {
    id: "ac-1",
    doc_version: 1,
    code: "1140-001",
    description_1: "Inventory - Food",
    nature: ACCOUNT_NATURE.DEBIT,
    type: ACCOUNT_CODE_TYPE.BALANCE_SHEET,
    is_active: true,
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>{children}</MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function renderAcTable(data: AccountCode[] = rows) {
  return renderHook(
    () =>
      useAcTable({
        data,
        totalRecords: data.length,
        params,
        tableConfig,
        onEdit: () => {},
        onDelete: () => {},
      }),
    { wrapper },
  );
}

describe("useAcTable", () => {
  it("มีคอลัมน์ครบตามฟิลด์ที่ backend ส่งมา", () => {
    const { result } = renderAcTable();
    for (const id of ["code", "description_1", "nature", "type"]) {
      expect(result.current.getColumn(id), `ต้องมีคอลัมน์ ${id}`).toBeDefined();
    }
  });

  it("ไม่เหลือคอลัมน์ name/description ของสัญญาเดิม", () => {
    const { result } = renderAcTable();
    // id ของคอลัมน์คือฟิลด์ที่ส่งไป sort ฝั่ง backend (`${id}:${dir}`) —
    // เหลือชื่อเก่าไว้ = กดหัวคอลัมน์แล้วยิงฟิลด์ที่ไม่มีอยู่จริง
    expect(result.current.getColumn("name")).toBeUndefined();
    expect(result.current.getColumn("description")).toBeUndefined();
  });

  it("แปลงค่า enum เป็นคำที่คนอ่านออก ไม่ใช่ค่าดิบ", () => {
    const { result } = renderAcTable();
    const cells = result.current.getRowModel().rows[0].getVisibleCells();
    const render = (id: string) => {
      const cell = cells.find((c) => c.column.id === id);
      const fn = cell?.column.columnDef.cell;
      return typeof fn === "function"
        ? (fn(cell!.getContext()) as string)
        : undefined;
    };
    expect(render("nature")).toBe("Debit");
    expect(render("type")).toBe("Balance sheet");
  });

  it("ซ่อนคอลัมน์วันที่สร้าง/แก้ไขไว้ก่อน (เปิดเองได้จากเมนูคอลัมน์)", () => {
    const { result } = renderAcTable();
    expect(result.current.getColumn("created_at")?.getIsVisible()).toBe(false);
    expect(result.current.getColumn("updated_at")?.getIsVisible()).toBe(false);
  });
});
