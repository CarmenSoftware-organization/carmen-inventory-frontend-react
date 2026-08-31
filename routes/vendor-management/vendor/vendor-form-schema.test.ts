import { describe, it, expect } from "vitest";
import {
  EMPTY_FORM,
  EMPTY_VENDOR_CONTACT,
  buildNestedPayload,
  createVendorSchema,
  getDefaultValues,
  mapContactPayload,
  type VendorFormValues,
} from "./vendor-form-schema";
import type { VendorDetail } from "@/types/vendor";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;
const schema = createVendorSchema(tv, tf);

const valid: VendorFormValues = {
  ...EMPTY_FORM,
  code: "V001",
  name: "ครัวกลาง ซัพพลาย",
};

describe("createVendorSchema", () => {
  it("code กับ name ห้ามว่าง", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, code: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("code ยาวได้ไม่เกิน 10 ตัว — backend คอลัมน์สั้น ปล่อยเกินไปเจอ 400", () => {
    expect(schema.safeParse({ ...valid, code: "1234567890" }).success).toBe(
      true,
    );
    expect(schema.safeParse({ ...valid, code: "12345678901" }).success).toBe(
      false,
    );
  });

  it("ที่อยู่บังคับแค่ประเภท ที่เหลือปล่อยว่างได้", () => {
    const withAddress = (address_type: string) => ({
      ...valid,
      vendor_address: [
        {
          address_type,
          address_line1: "",
          address_line2: "",
          city: "",
          district: "",
          sub_district: "",
          province: "",
          postal_code: "",
          country: "",
        },
      ],
    });
    expect(schema.safeParse(withAddress("billing")).success).toBe(true);
    expect(schema.safeParse(withAddress("")).success).toBe(false);
  });

  it("ผู้ติดต่อต้องมีชื่อ ส่วนอีเมลไม่บังคับแต่ถ้ากรอกต้องเป็นอีเมล", () => {
    const contact = (
      over: Partial<VendorFormValues["vendor_contact"][number]>,
    ) => ({
      ...valid,
      vendor_contact: [{ ...EMPTY_VENDOR_CONTACT, name: "สมชาย", ...over }],
    });
    expect(schema.safeParse(contact({})).success).toBe(true);
    expect(schema.safeParse(contact({ name: "" })).success).toBe(false);
    // ว่าง = ไม่ได้กรอก ผ่าน
    expect(schema.safeParse(contact({ email: "" })).success).toBe(true);
    expect(schema.safeParse(contact({ email: "a@b.co" })).success).toBe(true);
    for (const bad of ["ไม่ใช่อีเมล", "a@b", "a b@c.co", "@b.co"]) {
      expect(schema.safeParse(contact({ email: bad })).success, bad).toBe(
        false,
      );
    }
  });

  it("info ที่ไม่ใช่ array ถูกกลืนเป็น [] ไม่ทำให้ทั้งฟอร์มพัง", () => {
    // backend เคยส่ง info เป็น object/null มา — preprocess กันไว้
    const parsed = schema.parse({ ...valid, info: null });
    expect(parsed.info).toEqual([]);
  });
});

describe("getDefaultValues", () => {
  it("ไม่มี vendor = ฟอร์มเปล่าที่เปิดใช้งานไว้", () => {
    expect(getDefaultValues()).toEqual(EMPTY_FORM);
    expect(getDefaultValues().is_active).toBe(true);
  });

  it("รับ contacts ได้ทั้งสามชื่อ field ที่ API เคยส่งมา", () => {
    // ชื่อ field ของ contact เปลี่ยนมาสองรอบ — อ่านผิดชื่อคือผู้ติดต่อหายทั้งใบ
    const base = { code: "V1", name: "V", is_active: true } as VendorDetail;
    const one = [{ id: "c1", name: "คนที่หนึ่ง" }];
    expect(
      getDefaultValues({ ...base, vendor_contact: one } as VendorDetail)
        .vendor_contact[0].name,
    ).toBe("คนที่หนึ่ง");
    expect(
      getDefaultValues({ ...base, contacts: one } as VendorDetail)
        .vendor_contact[0].name,
    ).toBe("คนที่หนึ่ง");
    expect(
      getDefaultValues({ ...base, tb_vendor_contact: one } as VendorDetail)
        .vendor_contact[0].name,
    ).toBe("คนที่หนึ่ง");
  });

  it("เติมค่าว่างแทน null ที่ API ส่งมา ไม่ปล่อยให้ null ไหลเข้า input", () => {
    const v = {
      code: "V1",
      name: "V",
      is_active: true,
      description: null,
      vendor_contact: [{ id: "c1", name: "ก", email: null, phone: null }],
      vendor_address: [{ id: "a1", address_type: "billing", city: null }],
    } as unknown as VendorDetail;
    const d = getDefaultValues(v);
    expect(d.description).toBe("");
    expect(d.vendor_contact[0].email).toBe("");
    expect(d.vendor_contact[0].phone).toBe("");
    expect(d.vendor_address[0].city).toBe("");
  });
});

describe("buildNestedPayload", () => {
  const map = mapContactPayload as (i: unknown) => Record<string, unknown>;
  const row = (over: Record<string, unknown> = {}) =>
    ({
      name: "ก",
      email: "",
      phone: "",
      is_primary: false,
      ...over,
    }) as { id?: string } & Record<string, unknown>;

  it("แถวใหม่ (ไม่มี id) เข้า add", () => {
    const out = buildNestedPayload([row()], [], [], map, "vendor_contact_id");
    expect(out.add).toHaveLength(1);
    expect(out.update).toBeUndefined();
    expect(out.remove).toBeUndefined();
  });

  it("แถวเดิมที่ไม่ได้แก้ ไม่ถูกส่งไปเลย — ส่งไปคือ update ทั้งที่ไม่มีอะไรเปลี่ยน", () => {
    const out = buildNestedPayload(
      [row({ id: "c1" })],
      [undefined as never],
      [],
      map,
      "vendor_contact_id",
    );
    expect(out).toEqual({});
  });

  it("แถวเดิมที่แก้แล้วเข้า update พร้อม id", () => {
    const out = buildNestedPayload(
      [row({ id: "c1", name: "ข" })],
      [{ name: true }],
      [],
      map,
      "vendor_contact_id",
    );
    expect(out.update).toEqual([
      {
        vendor_contact_id: "c1",
        name: "ข",
        email: "",
        phone: "",
        is_primary: false,
      },
    ]);
  });

  it("id ที่ถูกลบเข้า remove — ส่งแค่ id ไม่ต้องส่งเนื้อ", () => {
    const out = buildNestedPayload([], [], ["c9"], map, "vendor_contact_id");
    expect(out.remove).toEqual([{ vendor_contact_id: "c9" }]);
  });

  it("dirty ของแถวหนึ่งต้องไม่ทำให้อีกแถวถูกนับว่าแก้ — เทียบด้วย index", () => {
    const out = buildNestedPayload(
      [row({ id: "c1" }), row({ id: "c2", name: "แก้แล้ว" })],
      [undefined as never, { name: true }],
      [],
      map,
      "vendor_contact_id",
    );
    expect(out.update).toHaveLength(1);
    expect(out.update?.[0].vendor_contact_id).toBe("c2");
  });
});
