import { beforeEach, describe, expect, it } from "vitest";
import type { JournalVoucherInput } from "@/types/journal-voucher";
import {
  clearJournalVoucherMockState,
  journalVoucherMockRepository,
} from "./journal-voucher-mock-repository";

const manualInput = (): JournalVoucherInput => ({
  journal_type: "general",
  prefix: "JV",
  journal_date: "2026-09-11",
  description: "Manual adjustment",
  note: null,
  functional_currency_id: "THB",
  source_system: "general_ledger",
  source_type: "manual",
  source_id: null,
  source_no: null,
  source_version: null,
  event_type: "manual",
  posting_rule_code: null,
  schedule_post: false,
  scheduled_post_at: null,
  auto_reverse: false,
  reverse_date: null,
  lines: [
    {
      account_id: "1000",
      department_id: null,
      comment: null,
      currency_id: "THB",
      exchange_rate: "1",
      rate_date: null,
      rate_type: null,
      rate_source: null,
      debit: "100.00",
      credit: "0.00",
      dimension: [],
    },
    {
      account_id: "2000",
      department_id: null,
      comment: null,
      currency_id: "THB",
      exchange_rate: "1",
      rate_date: null,
      rate_type: null,
      rate_source: null,
      debit: "0.00",
      credit: "100.00",
      dimension: [],
    },
  ],
});

describe("Journal Voucher mock repository boundary", () => {
  beforeEach(() => clearJournalVoucherMockState());

  it("keeps source-generated AP journals immutable in GL", async () => {
    const generated = await journalVoucherMockRepository.get(
      "BU-A",
      "mock-jv-001",
    );
    expect(generated?.source_type).toBe("ap_invoice");
    expect(generated?.capabilities?.can_reverse).toBe(false);
    await expect(
      journalVoucherMockRepository.action("BU-A", generated!.id, "reverse", {
        doc_version: generated!.doc_version,
      }),
    ).rejects.toThrow("Cannot reverse");
    await expect(
      journalVoucherMockRepository.copy("BU-A", generated!.id),
    ).rejects.toThrow("source document");
  });

  it("uses optimistic versions and posts a manual no-workflow journal once submitted", async () => {
    const created = await journalVoucherMockRepository.create(
      "BU-A",
      manualInput(),
    );
    await expect(
      journalVoucherMockRepository.update(
        "BU-A",
        created.id,
        created.doc_version + 1,
        manualInput(),
      ),
    ).rejects.toThrow("changed by another user");
    const submitted = await journalVoucherMockRepository.action(
      "BU-A",
      created.id,
      "submit",
      { doc_version: created.doc_version },
    );
    expect(submitted.jv_status).toBe("posted");
    expect(submitted.capabilities?.can_edit_accounting_fields).toBe(false);
  });

  it("isolates Journal Vouchers by Business Unit", async () => {
    const created = await journalVoucherMockRepository.create(
      "BU-A",
      manualInput(),
    );
    expect(
      await journalVoucherMockRepository.get("BU-B", created.id),
    ).toBeNull();
  });
});
