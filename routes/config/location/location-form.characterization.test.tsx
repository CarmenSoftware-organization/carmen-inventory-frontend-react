import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import { INVENTORY_TYPE } from "@/constant/location";
import type { Location } from "@/types/location";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "loc-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/hooks/use-location", () => ({
  useCreateLocation: () => createMut,
  useUpdateLocation: () => updateMut,
  useDeleteLocation: () => deleteMut,
  useLocation: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/hooks/use-all-users", () => ({
  useAllUsers: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/use-all-products", () => ({
  useAllProducts: () => ({ data: [], isLoading: false }),
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

const { LocationForm } = await import("./location-form");

const LOCATION: Location = {
  id: "loc-1",
  doc_version: 7,
  code: "WH-01",
  name: "Main Warehouse",
  location_type: INVENTORY_TYPE.INVENTORY,
  physical_count_type: "yes",
  description: "",
  is_active: true,
  info: {},
  user_location: [],
  product_location: [],
  // delivery_point_id เป็น required ใน schema — ฟอร์มจะไม่ยอม submit ถ้าไม่มี
  delivery_point: {
    id: "dp-1",
    doc_version: 1,
    name: "Dock A",
    is_active: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ LocationForm ไว้ก่อนยุบเข้า hook กลาง
 *
 * ตั้งใจให้ตรงข้ามกับ CuisineForm — ใบนี้เซฟแล้ว**อยู่หน้าเดิม** และ create แล้ว
 * **replace ไปหน้าใบใหม่** ส่วน cuisine กลับหน้ารายการทั้งสองทาง สองใบนี้คู่กัน
 * เป็นหลักฐานว่าเทสต์ชุดนี้แยกแยะได้จริง ไม่ได้เขียวเพราะไม่ได้ตรวจอะไร
 */
describe("LocationForm — characterization", () => {
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วอยู่หน้าเดิม ไม่เด้งกลับหน้ารายการ", async () => {
    renderForm(<LocationForm location={LOCATION} />);
    await enterEditMode();
    await act(async () => submitForm("location-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<LocationForm location={LOCATION} />);
    await enterEditMode();
    await act(async () => submitForm("location-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "loc-1",
      doc_version: 7,
    });
  });

  /**
   * โหมด add มี required ที่ต้องเลือกผ่าน lookup (delivery point / ชนิดคลัง /
   * การตรวจนับ) ซึ่งขับใน jsdom ไม่คุ้ม — ยืมโหมด edit มาพิสูจน์เส้น create แทน
   * ไม่ได้ เพราะ onSubmit แยกสาขาด้วย isAdd · เส้น create ของใบนี้จึงจับด้วย
   * เทสต์ระดับ integration ทีหลัง ตรงนี้บันทึกไว้ว่ายังไม่ได้ครอบ
   */
  it.todo("[create] เซฟแล้ว replace ไปหน้าใบที่เพิ่งสร้าง ไม่กลับหน้ารายการ");
});
