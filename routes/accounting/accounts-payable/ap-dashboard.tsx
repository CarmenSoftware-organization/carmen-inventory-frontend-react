import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  RefreshCw,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { addDecimal } from "./ap-decimal";
import { Money, humanizeAp } from "./ap-ui";
import { useApDashboard } from "./use-accounts-payable";

const isoToday = () => new Date().toISOString().slice(0, 10);
const monthStart = (date: string) => `${date.slice(0, 7)}-01`;

export default function ApDashboard() {
  const navigate = useNavigate();
  const [asOf, setAsOf] = useState(isoToday);
  const [paidFrom, setPaidFrom] = useState(() => monthStart(isoToday()));
  const [paidTo, setPaidTo] = useState(isoToday);
  const query = useApDashboard(asOf, paidFrom, paidTo);
  const data = query.data;
  const agingTotal = useMemo(
    () => addDecimal(data?.aging.map((item) => item.amount) ?? []),
    [data],
  );

  const openInvoices = (params: Record<string, string>) =>
    navigate(
      `/accounting/accounts-payable/invoice?${new URLSearchParams({ as_of: asOf, ...params })}`,
    );
  if (query.isError)
    return (
      <ErrorState
        message="Unable to load AP dashboard"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DocumentListHeader
          title="Accounts Payable Dashboard"
          description="Outstanding liabilities, due dates, approvals and tax exceptions"
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">As of</span>
            <DatePicker
              value={asOf}
              onValueChange={setAsOf}
              hideClear
              className="w-32"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Paid from</span>
            <DatePicker
              value={paidFrom}
              onValueChange={setPaidFrom}
              hideClear
              className="w-32"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Paid to</span>
            <DatePicker
              value={paidTo}
              onValueChange={setPaidTo}
              hideClear
              className="w-32"
            />
          </label>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh dashboard"
            onClick={() => query.refetch()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {query.isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section
            aria-label="AP summary"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <MetricCard
              icon={CircleDollarSign}
              title="Total AP Outstanding"
              value={
                <Money
                  value={data.outstanding_amount}
                  currency={data.functional_currency}
                />
              }
              meta={`${data.outstanding_count} open items`}
              onClick={() =>
                openInvoices({ lifecycle: "posted", settlement: "open" })
              }
            />
            <MetricCard
              icon={WalletCards}
              title="Prepaid Deposits"
              value={
                <Money
                  value={data.prepaid_amount}
                  currency={data.functional_currency}
                />
              }
              meta={`${data.prepaid_count} unapplied deposits`}
            />
            <MetricCard
              icon={FileCheck2}
              title="Total Paid Out"
              value={
                <Money
                  value={data.paid_out_amount}
                  currency={data.functional_currency}
                />
              }
              meta={`${data.payment_count} payments · ${paidFrom}–${paidTo}`}
              onClick={() =>
                navigate(
                  `/accounting/accounts-payable/payment?execution=executed&paid_from=${paidFrom}&paid_to=${paidTo}`,
                )
              }
            />
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarClock className="size-4" /> AP Aging Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-4">
                {data.aging.map((bucket) => (
                  <button
                    key={bucket.code}
                    type="button"
                    onClick={() => openInvoices({ due_bucket: bucket.code })}
                    className="hover:bg-accent focus-visible:ring-ring rounded-md border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-muted-foreground block text-xs">
                      {humanizeAp(bucket.code)}
                    </span>
                    <Money
                      value={bucket.amount}
                      currency={data.functional_currency}
                      className="mt-1 block text-sm font-semibold"
                    />
                    <span className="text-muted-foreground text-xs">
                      {bucket.item_count} items
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4" /> Due Date Tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 px-4 sm:grid-cols-3">
                <SmallMetric
                  label="Overdue"
                  value={data.due.overdue}
                  onClick={() => openInvoices({ due_bucket: "overdue" })}
                />
                <SmallMetric
                  label="On hold"
                  value={data.due.on_hold}
                  onClick={() => openInvoices({ hold: "true" })}
                />
                <SmallMetric
                  label="Reserved for payment"
                  value={data.due.reserved}
                  onClick={() => openInvoices({ reserved: "true" })}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileCheck2 className="size-4" /> Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 px-4">
                <SmallMetric
                  label="AP Invoices"
                  value={data.approvals.invoice}
                  onClick={() =>
                    navigate(
                      "/accounting/accounts-payable/invoice?lifecycle=submitted",
                    )
                  }
                />
                <SmallMetric
                  label="Payments"
                  value={data.approvals.payment}
                  onClick={() =>
                    navigate("/accounting/accounts-payable/payment?lifecycle=submitted")
                  }
                />
              </CardContent>
            </Card>
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ReceiptText className="size-4" /> Tax & Audit Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-3">
                <SmallMetric
                  label="Pending input VAT"
                  value={<Money value={data.tax.pending_vat} />}
                  onClick={() => openInvoices({ tax: "pending" })}
                />
                <SmallMetric
                  label="Missing tax documents"
                  value={data.tax.missing_documents}
                />
                <SmallMetric
                  label="Pending corrections"
                  value={data.tax.pending_corrections}
                  onClick={() => openInvoices({ match: "variance" })}
                />
              </CardContent>
            </Card>
          </section>

          {data.widget_errors.length > 0 && (
            <div className="border-destructive/40 bg-destructive/5 rounded-lg border p-3 text-sm">
              Some dashboard sections could not be refreshed: {data.widget_errors.join(", ")}
            </div>
          )}

          <div
            className={`rounded-md border px-3 py-2 text-xs ${data.reconciliation_variance === "0.00" ? "bg-success/10" : "bg-destructive/10"}`}
          >
            <span className="font-medium">Reconciliation:</span> Aging{" "}
            <Money value={agingTotal} currency={data.functional_currency} /> ·
            Variance <Money value={data.reconciliation_variance} /> ·
            Generated {new Date(data.generated_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  meta,
  onClick,
}: {
  icon: typeof CircleDollarSign;
  title: string;
  value: React.ReactNode;
  meta: string;
  onClick?: () => void;
}) {
  const content = (
    <Card className="h-full gap-2 py-4">
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-xl font-semibold">{value}</div>
        <p className="text-muted-foreground mt-1 text-xs">{meta}</p>
      </CardContent>
    </Card>
  );
  return onClick ? (
    <button
      type="button"
      className="focus-visible:ring-ring rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    content
  );
}

function SmallMetric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}) {
  const className =
    "hover:bg-accent focus-visible:ring-ring flex min-h-20 flex-col justify-between rounded-md border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none";
  const content = (
    <>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}
