import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "sc-new" } });

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

// ScForm เหลือแค่เส้น create แล้ว (เส้น edit เป็นโค้ดตายมาตั้งแต่วันแรก ลบทิ้งแล้ว)
vi.mock("./use-sc", () => ({
  useCreateSpotCheck: () => createMut,
  useSpotCheck: () => ({ data: undefined, isLoading: false }),
}));
// FormToolbar ปิดปุ่ม Edit เมื่อไม่มีสิทธิ์ — เทสต์นี้สนใจเส้นทางหลัง save
// ไม่ใช่ permission ให้ผ่านหมดไปเลย
vi.mock("@/hooks/use-can", () => ({
  useCan: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    guard: (_p: unknown, fn: () => void) => fn,
    isAdmin: true,
    permissions: [],
    canWrite: true,
  }),
}));

const { ScForm } = await import("./sc-form");

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ ScForm ไว้ก่อนยุบเข้า hook กลาง
 *
 * ฟอร์มนี้สร้างใบตรวจนับได้อย่างเดียว — หน้าแก้ไขใช้ `ScEntryComponent` คนละตัวกัน
 */
describe("ScForm — characterization", () => {
  /**
   * method "random" (ค่าตั้งต้น) มี refine ว่า items ต้อง >= 1 แต่ EMPTY_FORM ให้ 0
   * มาแต่แรก — ไม่กรอกช่องนี้ submit จะเงียบโดยไม่มี error โผล่ให้เห็น
   */
  async function fillItems() {
    const el = document.getElementById("sc-items") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(el, { target: { value: "5" } });
    });
  }

  it("[create] เซฟแล้วเด้งไปหน้าใบที่เพิ่งสร้าง", async () => {
    renderForm(
      <ScForm defaultLocationId="loc-1" defaultLocationName="Main Warehouse" />,
    );
    await fillItems();
    await act(async () => submitForm("sc-form"));

    expect(createMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      "/inventory-management/spot-check/sc-new",
    );
  });

  it("[create] payload แนบคลังที่ล็อกไว้", async () => {
    renderForm(
      <ScForm defaultLocationId="loc-1" defaultLocationName="Main Warehouse" />,
    );
    await fillItems();
    await act(async () => submitForm("sc-form"));

    expect(firstPayload(createMut)).toMatchObject({ location_id: "loc-1" });
  });
});
