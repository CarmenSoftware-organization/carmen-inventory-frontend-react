import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import en from "@/messages/en.json";
import type { VendorDetail } from "@/types/vendor";
import {
  fakeMutation,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

/**
 * กัน render loop ของ VendorCertificateSection ไม่ให้กลับมา
 *
 * `useReactTable` ต้องได้ `data` ที่เป็น reference นิ่ง — เขียน
 * `const items = data?.data ?? []` ตรง ๆ จะได้ array ใหม่ทุก render แล้ว table
 * sync state ไม่จบ วัดได้ **245,156 render ใน 60 วินาที** หน้าค้างสนิท
 *
 * **แค่ mount เฉย ๆ ไม่พอที่จะจุดชนวน** — ต้องมีจังหวะที่ parent re-render รัว ๆ
 * ซึ่งคือตอนเซฟ vendor สำเร็จ (`onSuccess` → `form.reset()` + `setMode("view")`)
 * เทสต์นี้จึงขับผ่าน VendorForm จริง ไม่ได้ mount section เดี่ยว ๆ
 *
 * assert ที่ **จำนวนรอบ** ไม่ใช่เวลา — เวลาเปลี่ยนตามเครื่อง แต่ 5 รอบกับสองแสนรอบ
 * ต่างกันคนละโลก
 */
const renders = { n: 0 };
const navigate = vi.fn();
const updateMut = fakeMutation();
const noop = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));
vi.mock("@/hooks/use-vendor", () => ({
  useCreateVendor: () => noop,
  useUpdateVendor: () => updateMut,
  useDeleteVendor: () => noop,
}));
// นับ render ของ section ผ่าน dialog ที่อยู่ข้างในมัน — ตัว section ต้องเป็นของจริง
vi.mock("./vendor-certificate-dialog", () => ({
  VendorCertificateDialog: () => {
    renders.n++;
    return null;
  },
}));
vi.mock("./use-vendor-certificate", () => ({
  useVendorCertificates: () => ({ data: undefined, isLoading: false }),
  useVendorCertificateById: () => ({ data: undefined, isLoading: false }),
  useCreateVendorCertificate: () => noop,
  useUpdateVendorCertificate: () => noop,
  useDeleteVendorCertificate: () => noop,
}));
vi.mock("../shared/use-certification", () => ({
  useCertification: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    dateFormat: "DD/MM/YYYY",
    dateTimeFormat: "DD/MM/YYYY HH:mm",
    defaultCurrencyCode: "THB",
    buCode: "BU-1",
  }),
}));
vi.mock("@/hooks/use-business-type", () => ({
  useBusinessType: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/hooks/use-thai-address", () => ({
  useThaiProvinces: () => ({ data: [], isLoading: false }),
  useThaiDistricts: () => ({ data: [], isLoading: false }),
  useThaiSubDistricts: () => ({ data: [], isLoading: false }),
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

const VENDOR: VendorDetail = {
  id: "ven-1",
  doc_version: 9,
  code: "V-001",
  name: "Acme Foods",
  description: "",
  is_active: true,
  business_type: [],
  info: [],
  vendor_address: [],
  vendor_contact: [],
};

describe("VendorCertificateSection — ไม่วน render หลังเซฟ vendor", () => {
  it("เซฟสำเร็จแล้ว section re-render ไม่กี่รอบแล้วนิ่ง", async () => {
    renderForm(<VendorForm vendor={VENDOR} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en.common.edit }));
    });
    await act(async () => submitForm("vendor-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    // ตอนไม่มีบั๊กวัดได้ 5 · ตอนมีบั๊กวัดได้ 245,156
    expect(renders.n).toBeLessThan(50);
  }, 20000);
});
