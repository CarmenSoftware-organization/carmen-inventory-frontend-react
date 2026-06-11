import { describe, it, expect } from "vitest";
import { paginateSchema, paginatedResponse, apiEnvelope } from "./api-schemas";
import { z } from "zod";
import { purchaseRequestSchema } from "@/types/purchase-request";

describe("paginateSchema", () => {
  it("accepts valid paginate object", () => {
    const result = paginateSchema.safeParse({
      total: 100,
      page: 1,
      perpage: 20,
      pages: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = paginateSchema.safeParse({ total: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects non-number values", () => {
    const result = paginateSchema.safeParse({
      total: "100",
      page: 1,
      perpage: 20,
      pages: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("paginatedResponse", () => {
  const schema = paginatedResponse(z.object({ id: z.string() }));

  it("accepts valid paginated response", () => {
    const result = schema.safeParse({
      data: [{ id: "1" }, { id: "2" }],
      paginate: { total: 2, page: 1, perpage: 20, pages: 1 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty data array", () => {
    const result = schema.safeParse({
      data: [],
      paginate: { total: 0, page: 1, perpage: 20, pages: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing paginate", () => {
    const result = schema.safeParse({ data: [{ id: "1" }] });
    expect(result.success).toBe(false);
  });

  it("allows extra fields (looseObject)", () => {
    const result = schema.safeParse({
      data: [{ id: "1" }],
      paginate: { total: 1, page: 1, perpage: 20, pages: 1 },
      currency: "THB",
      bu_code: "BU001",
    });
    expect(result.success).toBe(true);
  });
});

describe("apiEnvelope", () => {
  const schema = apiEnvelope(z.string());

  it("accepts valid envelope", () => {
    const result = schema.safeParse({ data: "hello" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.data).toBe("hello");
  });

  it("rejects missing data", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("purchaseRequestSchema (real fixture)", () => {
  const fixture = {
    id: "pr-001",
    pr_no: "PR-2025-0001",
    pr_date: "2025-06-01",
    description: "Office supplies",
    requestor_name: "John Doe",
    pr_status: "submitted",
    workflow_name: "Standard PR",
    workflow_current_stage: "Manager Approval",
    workflow_next_stage: "Director Approval",
    workflow_previous_stage: null,
    last_action: null,
    department_name: "Procurement",
    created_at: "2025-06-01T10:00:00Z",
    purchase_request_detail: [
      { price: 100, total_price: 500 },
      { price: 200, total_price: 200 },
    ],
  };

  it("validates a realistic PR list item", () => {
    const result = purchaseRequestSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it("allows extra fields on the item (looseObject)", () => {
    const withExtras = {
      ...fixture,
      doc_status: "active",
      vendor_name: "Acme Corp",
      some_future_field: 42,
    };
    const result = purchaseRequestSchema.safeParse(withExtras);
    expect(result.success).toBe(true);
  });

  it("allows extra fields on detail items (looseObject)", () => {
    const withDetailExtras = {
      ...fixture,
      purchase_request_detail: [
        { price: 100, total_price: 500, quantity: 5, product_name: "Pen" },
      ],
    };
    const result = purchaseRequestSchema.safeParse(withDetailExtras);
    expect(result.success).toBe(true);
  });

  it("rejects missing required field (id)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit `id`
    const { id: _, ...noId } = fixture;
    const result = purchaseRequestSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it("rejects wrong type (pr_date as number)", () => {
    const result = purchaseRequestSchema.safeParse({
      ...fixture,
      pr_date: 12345,
    });
    expect(result.success).toBe(false);
  });

  it("validates full paginated response with PR schema", () => {
    const paginatedPR = paginatedResponse(purchaseRequestSchema);
    const result = paginatedPR.safeParse({
      data: [fixture],
      paginate: { total: 1, page: 1, perpage: 20, pages: 1 },
    });
    expect(result.success).toBe(true);
  });
});
