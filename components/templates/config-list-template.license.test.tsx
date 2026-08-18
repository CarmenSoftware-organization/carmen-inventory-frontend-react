import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import { PERMISSION_DENIED_EVENT } from "@/components/permission-denied-dialog";
import type { BusinessUnitLicense } from "@/types/profile";

/**
 * `ConfigListTemplate` เป็น template ที่หน้า config **ทุกหน้า** ใช้ร่วมกัน
 * เดิมมันคิด `createDenied`/`updateDenied` จาก RBAC อย่างเดียว → สัญญาหมดอายุแล้ว
 * ยังกด Add ได้ กรอกฟอร์มได้ กด save แล้วเด้ง 403 ขณะที่ปุ่ม Delete บนแถวเดียวกัน
 * ถูกปิดไปแล้ว (useConfigTable เช็ค canWrite ตั้งแต่ task C4) = UI ขัดกันเองในจอเดียว
 */

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const profile = vi.fn();
vi.mock("@/hooks/use-profile", () => ({ useProfile: () => profile() }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));

vi.mock("@/hooks/use-data-grid-state", () => ({
  useDataGridState: () => ({
    params: {},
    search: "",
    setSearch: vi.fn(),
    tableConfig: {},
  }),
}));

vi.mock("@/hooks/use-list-filters", () => ({
  useListFilters: () => ({
    filterParam: "",
    values: {},
    setValue: vi.fn(),
    clearAll: vi.fn(),
    sortParam: "",
    activeFilters: [],
    view: { canManageBu: false, existingNames: [], saveOrUpdate: vi.fn() },
  }),
}));

vi.mock("@/hooks/use-grid-pagination", () => ({
  useGridPagination: () => ({
    items: [{ id: "1", name: "Alpha" }],
    totalRecords: 1,
    isLoading: false,
    hasMore: false,
    isLoadingMore: false,
    sentinelRef: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-pull-to-refresh", () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    distance: 0,
    isRefreshing: false,
    progress: 0,
  }),
}));

vi.mock("@/hooks/use-permission-prefix", () => ({
  usePermissionPrefix: () => "configuration.department",
}));

vi.mock("@/hooks/use-export-error-toast", () => ({
  useExportErrorToast: () => vi.fn(),
}));

vi.mock("@/components/search-input", () => ({ default: () => null }));
vi.mock("@/components/list-filter/view-selector", () => ({
  ViewSelector: () => null,
}));
vi.mock("@/components/list-filter/list-filter-sheet", () => ({
  ListFilterSheet: () => null,
}));
vi.mock("@/components/list-filter/save-view-dialog", () => ({
  SaveViewDialog: () => null,
}));
vi.mock("@/components/ui/active-filter-bar", () => ({
  ActiveFilterBar: () => null,
}));

import { ConfigListTemplate } from "./config-list-template";

interface Row {
  id: string;
  name: string;
}

function license(
  overrides: Partial<BusinessUnitLicense> = {},
): BusinessUnitLicense {
  return {
    state: "active",
    end_date: "2027-01-01T00:00:00.000Z",
    // backend ส่ง module มาคู่กับ resource เสมอ — `isLicensed` ตรวจทั้งคู่
    features: ["configuration", "configuration.department"],
    seat: { used: 0, cap: 0, pending_invites: 0 },
    ...overrides,
  };
}

const readOnlySpy = vi.fn();

function setup(buLicense: BusinessUnitLicense) {
  setRuntimeConfigForTests({
    BACKEND_URL: "",
    X_APP_ID: "app-1",
    LICENSE_ENFORCEMENT: true,
  });
  // admin → RBAC ผ่านทุกอย่าง เหลือ license เป็นตัวเดียวที่ยังบล็อกได้
  profile.mockReturnValue({
    defaultBu: { system_level: "admin", permissions: [] },
    license: buLicense,
  });

  render(
    <MemoryRouter>
      <ConfigListTemplate<Row>
        translationNamespace="config.department"
        entityNameField="name"
        pageKey="department"
        filterFields={[]}
        useList={() => ({
          data: { data: [{ id: "1", name: "Alpha" }], paginate: { total: 1 } },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })}
        useDelete={() => ({ mutate: vi.fn(), isPending: false })}
        useTable={() => ({}) as never}
        renderCard={({ item, onEdit }) => (
          <button type="button" onClick={() => onEdit(item)}>
            edit {item.name}
          </button>
        )}
        renderDialog={({ readOnly, entity }) => {
          readOnlySpy({ readOnly, entityId: entity?.id ?? null });
          return null;
        }}
      />
    </MemoryRouter>,
  );
}

function addButton() {
  return screen.getByRole("button", { name: "add" });
}

beforeEach(() => {
  vi.clearAllMocks();
  readOnlySpy.mockClear();
});

describe("ConfigListTemplate — license gate on writes", () => {
  it("สัญญา active: ปุ่ม Add ใช้ได้ตามปกติ", () => {
    setup(license());
    expect(addButton()).not.toHaveAttribute("aria-disabled");
  });

  it("สัญญาหมดอายุ: ปุ่ม Add ถูกปิด แม้ผู้ใช้จะเป็น admin (license ไม่มี admin bypass)", () => {
    setup(license({ state: "expired" }));
    expect(addButton()).toHaveAttribute("aria-disabled", "true");
  });

  it('สัญญาหมดอายุ: กด Add แล้วเด้ง dialog เหตุผล "expired" ไม่ใช่ "permission"', async () => {
    setup(license({ state: "expired" }));
    const detail: unknown[] = [];
    const handler = (e: Event) => detail.push((e as CustomEvent).detail);
    window.addEventListener(PERMISSION_DENIED_EVENT, handler);
    await userEvent.click(addButton());
    window.removeEventListener(PERMISSION_DENIED_EVENT, handler);

    expect(detail).toHaveLength(1);
    expect(detail[0]).toMatchObject({
      reason: "expired",
      permission: "configuration.department.create",
    });
  });

  it("สัญญาถูกระงับ (inactive): dialog แก้ไขถูกบังคับเป็น readOnly", async () => {
    setup(license({ state: "inactive" }));
    await userEvent.click(screen.getByRole("button", { name: "edit Alpha" }));
    expect(readOnlySpy).toHaveBeenLastCalledWith({
      readOnly: true,
      entityId: "1",
    });
  });

  it("สัญญา active: dialog แก้ไขยังแก้ได้ (readOnly false)", async () => {
    setup(license());
    await userEvent.click(screen.getByRole("button", { name: "edit Alpha" }));
    expect(readOnlySpy).toHaveBeenLastCalledWith({
      readOnly: false,
      entityId: "1",
    });
  });

  it("สวิตช์ปิด (shadow mode): สัญญาหมดอายุก็ยังกด Add ได้ ไม่ล็อกอะไรเลย", async () => {
    setRuntimeConfigForTests({
      BACKEND_URL: "",
      X_APP_ID: "app-1",
      LICENSE_ENFORCEMENT: false,
    });
    profile.mockReturnValue({
      defaultBu: { system_level: "admin", permissions: [] },
      license: license({ state: "expired" }),
    });
    render(
      <MemoryRouter>
        <ConfigListTemplate<Row>
          translationNamespace="config.department"
          entityNameField="name"
          pageKey="department"
          filterFields={[]}
          useList={() => ({
            data: { data: [], paginate: { total: 0 } },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          })}
          useDelete={() => ({ mutate: vi.fn(), isPending: false })}
          useTable={() => ({}) as never}
          renderCard={({ item }) => <span>{item.name}</span>}
          renderDialog={() => null}
        />
      </MemoryRouter>,
    );
    expect(addButton()).not.toHaveAttribute("aria-disabled");
  });
});
