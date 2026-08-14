import { describe, it, expect } from "vitest";
import {
  prepareApproveDetails,
  preparePurchaseDetails,
  resolveApprovedQty,
} from "./pr-form-schema";
import type { PrFormValues } from "./pr-form-schema";

// สร้าง item ขั้นต่ำสำหรับทดสอบ prepareApproveDetails — สนใจเฉพาะ field
// stage_status / current_stage_status ที่ตัดสินใจ action ราย item
const makeItem = (
  partial: Partial<PrFormValues["items"][number]>,
): PrFormValues["items"][number] =>
  ({
    id: "d1",
    stage_status: "",
    current_stage_status: "pending",
    approved_qty: 1,
    requested_unit_id: "u1",
    ...partial,
  }) as PrFormValues["items"][number];

const statusOf = (item: PrFormValues["items"][number]): string =>
  prepareApproveDetails([item], "pr1")[0].stage_status;

describe("prepareApproveDetails stage_status", () => {
  it("keeps a rejected item as reject even when stage_status is empty (loaded from DB)", () => {
    // เคสของ bug: item ถูก reject (current_stage_status) แต่ stage_status ว่าง
    // ต้องไม่ถูกส่งเป็น approve
    expect(
      statusOf(
        makeItem({ stage_status: "", current_stage_status: "rejected" }),
      ),
    ).toBe("reject");
  });

  it("keeps an item rejected this session as reject", () => {
    expect(
      statusOf(
        makeItem({
          stage_status: "rejected",
          current_stage_status: "rejected",
        }),
      ),
    ).toBe("reject");
  });

  it("preserves a review item as review", () => {
    expect(
      statusOf(makeItem({ stage_status: "", current_stage_status: "review" })),
    ).toBe("review");
  });

  it("approves an explicitly approved item", () => {
    expect(
      statusOf(
        makeItem({ stage_status: "approve", current_stage_status: "approve" }),
      ),
    ).toBe("approve");
  });

  it("defaults a pending/untouched item to approve", () => {
    expect(
      statusOf(makeItem({ stage_status: "", current_stage_status: "pending" })),
    ).toBe("approve");
  });
});

describe("prepareApproveDetails null FK omission", () => {
  // backend รับ tax_profile_id เป็น string (ห้าม null) — item ที่ถูก reject มัก
  // ยังไม่มี tax profile → ต้อง omit ออกจาก payload ไม่ใช่ส่ง null
  it("omits null string FK fields instead of sending null", () => {
    const [payload] = prepareApproveDetails(
      [
        makeItem({
          current_stage_status: "rejected",
          tax_profile_id: null,
          location_id: null,
          delivery_point_id: null,
          pricelist_detail_id: null,
        }),
      ],
      "pr1",
    );

    for (const field of [
      "tax_profile_id",
      "location_id",
      "delivery_point_id",
      "pricelist_detail_id",
    ] as const) {
      expect(payload[field], `${field} must not be null`).toBeUndefined();
    }
  });

  it("keeps a real tax_profile_id on an approved item", () => {
    const [payload] = prepareApproveDetails(
      [makeItem({ stage_status: "approve", tax_profile_id: "tax-1" })],
      "pr1",
    );
    expect(payload.tax_profile_id).toBe("tax-1");
  });
});

describe("resolveApprovedQty", () => {
  it("falls back to requested_qty when approver never set approved_qty", () => {
    expect(resolveApprovedQty({ approved_qty: 0, requested_qty: 5 })).toBe(5);
  });

  it("uses approved_qty once it is set", () => {
    expect(resolveApprovedQty({ approved_qty: 3, requested_qty: 5 })).toBe(3);
  });
});

describe("preparePurchaseDetails", () => {
  // จอ (pr-item-expand / pr-item-fields) คิดยอดด้วย approved_qty ที่ fallback ไป
  // requested_qty — payload ต้องคิดด้วยตัวเดียวกัน ไม่งั้นบันทึกยอดเป็น 0
  it("prices an untouched item off requested_qty, not zero", () => {
    const [payload] = preparePurchaseDetails(
      [
        makeItem({
          approved_qty: 0,
          requested_qty: 4,
          pricelist_price: 100,
          tax_rate: 10,
        }),
      ],
      "pr1",
    );

    expect(payload.approved_qty).toBe(4);
    expect(payload.sub_total_price).toBe(400);
    expect(payload.net_amount).toBe(400);
    expect(payload.tax_amount).toBe(40);
    expect(payload.total_price).toBe(440);
  });

  it("embeds purchase_request_id — backend requires it on every detail", () => {
    const [payload] = preparePurchaseDetails([makeItem({})], "pr1");
    expect(payload.purchase_request_id).toBe("pr1");
  });

  it("denormalizes current_stage_status to the backend enum", () => {
    const [payload] = preparePurchaseDetails(
      [makeItem({ current_stage_status: "rejected" })],
      "pr1",
    );
    expect(payload.current_stage_status).toBe("reject");
  });

  it("omits null string FK fields instead of sending null", () => {
    const [payload] = preparePurchaseDetails(
      [
        makeItem({
          current_stage_status: "rejected",
          vendor_id: null,
          currency_id: null,
          tax_profile_id: null,
          pricelist_type: null,
        }),
      ],
      "pr1",
    );

    for (const field of [
      "vendor_id",
      "currency_id",
      "tax_profile_id",
      "tax_profile_name",
      "pricelist_type",
    ] as const) {
      expect(payload[field], `${field} must not be null`).toBeUndefined();
    }
  });

  it("ไม่ส่ง key ที่ zod รับแต่ไม่มี column จริง", () => {
    // total_amount กับ foc_unit_conversion_rate อยู่ใน zod ของ gateway แต่
    // tb_purchase_request_detail ไม่มีสอง column นี้ (foc ใช้ ..._factor) →
    // /approve spread เข้า Prisma ตรงๆ แล้วตีกลับทั้ง payload
    const [payload] = preparePurchaseDetails([makeItem({})], "pr1");
    expect(payload).not.toHaveProperty("total_amount");
    expect(payload).not.toHaveProperty("foc_unit_conversion_rate");
  });

  it("keeps pricelist_detail_id / pricelist_no as explicit null keys", () => {
    // สอง field นี้ backend เป็น nullable แต่ไม่ optional — key ต้องมี
    const [payload] = preparePurchaseDetails(
      [makeItem({ pricelist_detail_id: null, pricelist_no: null })],
      "pr1",
    );
    expect(payload).toHaveProperty("pricelist_detail_id", null);
    expect(payload).toHaveProperty("pricelist_no", null);
  });
});
