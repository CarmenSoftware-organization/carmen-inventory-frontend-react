import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import { useBankAccounts, useGlPeriods } from "./use-accounting-master";

vi.mock("@/hooks/use-bu-code", () => ({ useBuCode: () => "CARMEN-AVG" }));
vi.mock("@/lib/http-client", () => ({ httpClient: { get: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  );
}

describe("accounting API lookups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps bank and period API fields without seed records", async () => {
    vi.mocked(httpClient.get).mockImplementation(async (url) =>
      new Response(
        JSON.stringify({
          data: url.includes("bank-accounts")
            ? [{ id: "bank-1", bank_name: "Bank", bank_branch: "Main", account_no: "123", name: "Operating", chart_of_accounts_id: "coa-1", currency_code: "THB", is_active: true }]
            : [{ id: "period-1", fiscal_year: 2026, period_no: 9, start_at: "2026-09-01T00:00:00.000Z", end_at: "2026-09-30T23:59:59.999Z", status: "closed" }],
        }),
        { status: 200 },
      ),
    );

    const bank = renderHook(() => useBankAccounts(), { wrapper });
    const period = renderHook(() => useGlPeriods(), { wrapper });
    await waitFor(() => expect(bank.result.current.isSuccess && period.result.current.isSuccess).toBe(true));

    expect(bank.result.current.data).toEqual([{ id: "bank-1", code: "", bank_name: "Bank", branch_name: "Main", account_number: "123", account_name: "Operating", gl_account_id: "coa-1", currency_code: "THB", currency_id: "", is_active: true, doc_version: 0 }]);
    expect(period.result.current.data).toEqual([{ id: "period-1", fiscal_year: 2026, period_number: 9, start_date: "2026-09-01", end_date: "2026-09-30", status: "closed", doc_version: 0 }]);
  });

  it("shows an API error instead of fake bank accounts or periods", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(new Response(null, { status: 500 }));
    const bank = renderHook(() => useBankAccounts(), { wrapper });
    const period = renderHook(() => useGlPeriods(), { wrapper });
    await waitFor(() => expect(bank.result.current.isError && period.result.current.isError).toBe(true));
    expect(bank.result.current.data).toBeUndefined();
    expect(period.result.current.data).toBeUndefined();
  });
});
