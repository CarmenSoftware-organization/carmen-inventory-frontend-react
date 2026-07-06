import { describe, it, expect } from "vitest";
import { prepareApproveDetails } from "./pr-form-schema";
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
      statusOf(makeItem({ stage_status: "", current_stage_status: "rejected" })),
    ).toBe("reject");
  });

  it("keeps an item rejected this session as reject", () => {
    expect(
      statusOf(
        makeItem({ stage_status: "rejected", current_stage_status: "rejected" }),
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
