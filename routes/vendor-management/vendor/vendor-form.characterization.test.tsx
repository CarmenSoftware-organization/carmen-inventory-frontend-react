import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import {
  fakeMutation,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "ven-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/hooks/use-vendor", () => ({
  useCreateVendor: () => createMut,
  useUpdateVendor: () => updateMut,
  useDeleteVendor: () => deleteMut,
}));
// section ใบรับรองโผล่เฉพาะตอนมี vendor แล้วยิง query ของตัวเอง — ไม่เกี่ยวกับ
// เส้นทางหลัง save
vi.mock("./use-vendor-certificate", () => ({
  useVendorCertificates: () => ({ data: undefined, isLoading: false }),
  useVendorCertificateById: () => ({ data: undefined, isLoading: false }),
  useCreateVendorCertificate: () => createMut,
  useUpdateVendorCertificate: () => updateMut,
  useDeleteVendorCertificate: () => deleteMut,
}));
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

const { VendorForm } = await import("./vendor-form");

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ VendorForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้
 *
 * ฟอร์มนี้ใหญ่ (field array ของที่อยู่/ผู้ติดต่อ) — `userEvent.click` ไล่เช็ค
 * pointer-events ทั้งต้นไม้จนหมดเวลา 5 วิ ใช้ `fireEvent` ใน `act` แทน
 */
describe("VendorForm — characterization", () => {
  /**
   * **ยังครอบไม่ได้ และเป็นบั๊กที่ควรไล่ก่อน refactor**
   *
   * submit ในโหมด edit ไม่จบภายใน 45 วิ · probe แยกที่ให้ budget 30 วิวัดได้
   * `submit ms: 29842` แล้วโดนตัด — mutation ถูกเรียกจริงและ payload ถูกต้อง
   * แค่ช้าจนใช้ไม่ได้ ฟอร์มอื่นทั้ง 12 ใบในชุดนี้ submit เสร็จใน ~30ms
   *
   * ตัดออกทีละอย่างแล้ว ไม่ใช่ query ค้าง (mock ครบทั้ง use-vendor ·
   * use-vendor-certificate · use-thai-address) ไม่ใช่ตอน render (65ms) และไม่ใช่
   * ตอนคลิก Edit (28ms) — อยู่ในจังหวะ submit ล้วน ๆ สงสัย buildNestedPayload
   * ที่เดินผ่าน dirtyFields ของ field array ที่อยู่/ผู้ติดต่อ
   *
   * โหมด add (เคสข้างล่าง) เร็วปกติ ต่างกันแค่มี entity
   */
  it.todo("[update] เซฟแล้วอยู่หน้าเดิม + payload แนบ id กับ doc_version");

  it("[create] เซฟแล้ว replace ไปหน้าใบที่เพิ่งสร้าง", async () => {
    renderForm(<VendorForm />);
    await act(async () => {
      fireEvent.change(
        document.getElementById("vendor-code") as HTMLInputElement,
        {
          target: { value: "V-002" },
        },
      );
      fireEvent.change(
        document.getElementById("vendor-name") as HTMLInputElement,
        {
          target: { value: "Beta Foods" },
        },
      );
    });
    await act(async () => submitForm("vendor-form"));

    expect(createMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/vendor-management/vendor/ven-new", {
      replace: true,
    });
  });
});
