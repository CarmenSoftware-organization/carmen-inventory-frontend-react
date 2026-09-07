import { beforeEach, describe, expect, it } from "vitest";
import {
  clearApMockStorage,
  createApMockRepository,
} from "./ap-mock-repository";

const BU_A = "AP-TEST-A";
const BU_B = "AP-TEST-B";

beforeEach(() => {
  clearApMockStorage(BU_A);
  clearApMockStorage(BU_B);
});

describe("AP mock repository", () => {
  it("persists payment sections and protects submitted documents", async () => {
    const repository = createApMockRepository(BU_A);
    const seed = await repository.getPayment("pv-1");
    if (!seed) throw new Error("Missing seed");
    await expect(repository.savePayment(seed, seed.id, seed.doc_version)).rejects.toThrow("read-only");
    const draft = await repository.paymentAction(seed.id, "return", seed.doc_version);
    const saved = await repository.savePayment({ ...draft, paid_date: "2026-09-07", other_expenses: [{ id: "fee", description: "Bank fee", account: "6100", cost_center: "800", dimensions: "", base_amount: "40" }], tax_invoices: [{ id: "tax", document_no: "TAX1", date: "2026-09-07", tax_id: "MOCK", branch: "00000", profile: "VAT7", filing_period: "2026-09", status: "confirmed", base_amount: "100", vat_amount: "7" }] }, draft.id, draft.doc_version);
    const reloaded = await createApMockRepository(BU_A).getPayment(saved.id);
    expect(reloaded?.other_expenses?.[0].base_amount).toBe("40");
    expect(reloaded?.tax_invoices?.[0].document_no).toBe("TAX1");
    expect(reloaded?.net_pay).toBe("104040.00");
  });

  it("blocks mismatched payment allocations and missing WHT override reason", async () => {
    const repository = createApMockRepository(BU_A);
    const draft = await repository.paymentAction("pv-1", "return", 1);
    await expect(repository.savePayment({ ...draft, applications: draft.applications.map((item) => ({ ...item, wht_amount: "1" })) }, draft.id, draft.doc_version)).rejects.toThrow("reason");
    const saved = await repository.savePayment({ ...draft, payment_methods: [] }, draft.id, draft.doc_version);
    await expect(repository.paymentAction(saved.id, "submit", saved.doc_version)).rejects.toThrow("allocations");
  });
  it("seeds, persists and isolates data by BU", async () => {
    const first = createApMockRepository(BU_A);
    const other = createApMockRepository(BU_B);
    const draft = await first.getInvoice("ap-4");
    expect(draft?.lifecycle).toBe("draft");
    if (!draft) throw new Error("Missing seed invoice");
    await first.invoiceAction(draft.id, "void", draft.doc_version);
    expect(
      (await createApMockRepository(BU_A).getInvoice(draft.id))?.lifecycle,
    ).toBe("voided");
    expect((await other.getInvoice(draft.id))?.lifecycle).toBe("draft");
  });

  it("reconciles dashboard aging to outstanding", async () => {
    const snapshot = await createApMockRepository(BU_A).dashboard(
      "2026-09-01",
      "2026-08-01",
      "2026-09-01",
    );
    expect(snapshot.reconciliation_variance).toBe("0.00");
    expect(snapshot.outstanding_count).toBeGreaterThan(0);
    expect(
      snapshot.aging.reduce((count, bucket) => count + bucket.item_count, 0),
    ).toBe(snapshot.outstanding_count);
  });

  it("enforces workflow, optimistic version and match variance", async () => {
    const repository = createApMockRepository(BU_A);
    const draft = await repository.getInvoice("ap-4");
    if (!draft) throw new Error("Missing seed invoice");
    await expect(
      repository.invoiceAction(draft.id, "submit", draft.doc_version),
    ).rejects.toThrow("acknowledged");
    await expect(
      repository.invoiceAction(draft.id, "void", draft.doc_version + 1),
    ).rejects.toThrow("changed by another user");
    const submitted = await repository.invoiceAction("ap-2", "approve", 1);
    expect(submitted.lifecycle).toBe("posted");
    expect(submitted.open_amount).toBe(submitted.total_amount);
  });

  it("releases once and applies the payment without duplicate history", async () => {
    const repository = createApMockRepository(BU_A);
    const approved = await repository.paymentAction("pv-1", "approve", 1);
    const released = await repository.paymentAction(
      approved.id,
      "release",
      approved.doc_version,
      "release-test-key",
    );
    expect(released.execution_status).toBe("executed");
    const invoice = await repository.getInvoice("ap-1");
    expect(invoice?.open_amount).toBe("0.00");
    expect(invoice?.settlement_status).toBe("paid");
    await repository.paymentAction(
      approved.id,
      "release",
      approved.doc_version,
      "release-test-key",
    );
    expect((await repository.getInvoice("ap-1"))?.payments).toHaveLength(1);
  });

  it("returns partial batch outcomes through independent mutations", async () => {
    const repository = createApMockRepository(BU_A);
    const payments = await repository.listApprovals({ lifecycle: "submitted" });
    const results = await Promise.allSettled([
      repository.paymentAction(
        payments.data[0].id,
        "approve",
        payments.data[0].doc_version,
      ),
      repository.paymentAction("missing", "approve", 1),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
  });
});
