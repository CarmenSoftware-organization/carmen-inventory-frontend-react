import type { VisualKey } from "./landing-types";

const VIZ_WRAP =
  "absolute inset-0 flex flex-col justify-end px-2 pt-2 pb-2 pl-11";

/**
 * สีเดียวที่ภาพจำลองใช้ได้
 *
 * เดิมแต่ละโมดูลรับ `tint` จาก `TONE_COLOR` ซึ่งเป็น map 5 สี (indigo/blue/
 * green/rose/orange) ใช้เข้ารหัสว่าโมดูลไหนเป็นหมวดไหน — docs/DESIGN.md บอกว่า
 * "no second brand color exists" การ์ดแยกกันด้วยไอคอน ชื่อ และตัวภาพอยู่แล้ว
 * ไม่ต้องใช้สีมาบอกหมวด
 */
const ACCENT = "var(--primary)";

export function ModuleVisual({ visualKey }: { readonly visualKey: VisualKey }) {
  switch (visualKey) {
    case "roles":
      return <RolesViz />;
    case "assign":
      return <AssignViz />;
    case "period":
      return <PeriodViz />;
    case "workflows":
      return <WorkflowsViz />;
    case "docs":
      return <DocsViz />;
    case "userActivity":
      return <UserActivityViz />;
    case "monitor":
      return <MonitorViz />;
    case "email":
      return <EmailViz />;
    case "notify":
      return <NotifyViz />;
    case "code":
      return <CodeViz />;
    case "query":
      return <QueryViz />;
    case "dataset":
      return <DatasetViz />;
    default:
      return null;
  }
}

function RolesViz() {
  const roles = ["Buyer", "Storekeeper", "Finance"];
  const perms = ["View", "Create", "Approve", "Export"];
  const matrix = [
    [1, 1, 0, 1],
    [1, 1, 0, 0],
    [1, 0, 1, 1],
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-2">
        <div className="grid grid-cols-[3.75rem_repeat(4,1fr)] gap-1">
          <span />
          {perms.map((p) => (
            <span
              key={p}
              className="text-muted-foreground text-center text-[0.5rem] font-semibold tracking-wider uppercase"
            >
              {p}
            </span>
          ))}
        </div>
        {roles.map((r, i) => (
          <div
            key={r}
            className={`grid grid-cols-[3.75rem_repeat(4,1fr)] items-center gap-1 py-1 ${
              i === 0 ? "" : "border-border-subtle border-t"
            }`}
          >
            <span className="text-foreground text-[0.625rem] font-semibold">
              {r}
            </span>
            {matrix[i].map((v, j) => (
              <span
                key={j}
                className="h-2 w-full rounded-[1px]"
                style={
                  v
                    ? { background: ACCENT }
                    : {
                        background: "transparent",
                        border: "1px solid var(--border)",
                      }
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignViz() {
  const users = [
    { i: "AC", n: "A. Chen", r: "Buyer" },
    { i: "MR", n: "M. Rodriguez", r: "Storekeeper" },
    { i: "FN", n: "F. Ng", r: "Finance" },
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-1.5">
        {users.map((u, i) => (
          <div
            key={u.i}
            className={`flex items-center gap-1.5 px-1 py-1.5 ${
              i === users.length - 1 ? "" : "border-border-subtle border-b"
            }`}
          >
            <span
              className="inline-flex size-4 items-center justify-center rounded-full text-[0.5rem] font-semibold"
              style={{
                background:
                  "color-mix(in oklch, var(--primary), var(--card) 80%)",
                color: ACCENT,
              }}
            >
              {u.i}
            </span>
            <span className="text-foreground flex-1 text-[0.625rem] font-semibold">
              {u.n}
            </span>
            <span
              className="rounded-sm px-1.5 py-0.5 text-[0.5rem] font-semibold tracking-wider uppercase"
              style={{
                background:
                  "color-mix(in oklch, var(--primary), var(--card) 80%)",
                color: ACCENT,
              }}
            >
              {u.r}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeriodViz() {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const status: ReadonlyArray<"c" | "o" | "f"> = [
    "c",
    "c",
    "c",
    "c",
    "o",
    "o",
    "f",
    "f",
    "f",
    "f",
    "f",
    "f",
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-2">
        <div className="text-muted-foreground mb-1.5 text-[0.5625rem] font-semibold tracking-wider uppercase">
          FY 2026 · Months
        </div>
        <div className="grid grid-cols-12 gap-0.5">
          {months.map((m, i) => {
            const s = status[i];
            const style =
              s === "c"
                ? {
                    background: "var(--border-subtle)",
                    color: "var(--muted-foreground)",
                  }
                : s === "o"
                  ? { background: ACCENT, color: "var(--primary-foreground)" }
                  : {
                      background: "transparent",
                      color: "var(--muted-foreground)",
                      border: "1px dashed var(--border)",
                    };
            return (
              <div
                key={m}
                className="rounded-[1px] py-1 text-center text-[0.5rem] font-semibold"
                style={style}
              >
                {m}
              </div>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-1.5 flex gap-2 text-[0.5rem]">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-[1px]"
              style={{ background: ACCENT }}
            />
            Open
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="bg-border-subtle inline-block size-2 rounded-[1px]" />
            Closed
          </span>
        </div>
      </div>
    </div>
  );
}

function WorkflowsViz() {
  const nodes = [
    { x: 20, y: 50, l: "Draft", filled: false, accent: false },
    { x: 95, y: 30, l: "Dept.", filled: false, accent: false },
    { x: 95, y: 70, l: "Buyer", filled: false, accent: false },
    { x: 175, y: 50, l: "Finance", filled: true, accent: true },
    { x: 255, y: 50, l: "Done", filled: true, accent: false },
  ];
  const edges = [
    [42, 50, 73, 32],
    [42, 50, 73, 68],
    [117, 32, 153, 48],
    [117, 68, 153, 52],
    [197, 50, 233, 50],
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center px-2 pl-11">
      <svg
        viewBox="0 0 280 100"
        className="h-16 w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <marker
            id="wf-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
          </marker>
        </defs>
        {nodes.map((n, i) => {
          // "เสร็จแล้ว" ไม่ใช้เขียว — นั่นคือ accent ตัวที่สอง สเต็ปที่ผ่านแล้ว
          // กับสเต็ปปัจจุบันแยกกันด้วย accent เต็ม vs เทาทึบ ไม่ใช่คนละสี
          const fill = n.accent
            ? ACCENT
            : n.filled
              ? "var(--muted-foreground)"
              : "var(--card)";
          const text = n.filled
            ? "var(--primary-foreground)"
            : "var(--foreground)";
          return (
            <g key={i}>
              <rect
                x={n.x - 22}
                y={n.y - 11}
                width="44"
                height="22"
                rx="3"
                fill={fill}
                stroke={ACCENT}
                strokeWidth="1"
              />
              <text
                x={n.x}
                y={n.y + 3.5}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={text}
              >
                {n.l}
              </text>
            </g>
          );
        })}
        {edges.map(([x1, y1, x2, y2], i) => (
          <path
            key={i}
            d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke={ACCENT}
            strokeWidth="1.3"
            fill="none"
            markerEnd="url(#wf-arrow)"
          />
        ))}
      </svg>
    </div>
  );
}

function DocsViz() {
  const tree = [
    { d: 0, label: "Procurement", kind: "folder" as const },
    { d: 1, label: "POs · 2026", kind: "folder" as const },
    { d: 2, label: "PO-12480.pdf", kind: "file" as const },
    { d: 2, label: "PO-12481.pdf", kind: "file" as const },
    { d: 1, label: "GRNs · 2026", kind: "folder" as const },
    { d: 0, label: "Finance", kind: "folder" as const },
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-2">
        {tree.map((row, i) => (
          <div
            key={i}
            className="text-foreground flex items-center gap-1.5 py-0.5 text-[0.5625rem]"
            style={{ paddingLeft: `${0.375 + row.d * 0.75}rem` }}
          >
            <span className="inline-flex size-2.5 items-center justify-center">
              {row.kind === "folder" ? (
                <span
                  className="block h-[7px] w-[9px] rounded-[1px]"
                  style={{ background: ACCENT }}
                />
              ) : (
                <span className="bg-card border-muted-foreground block h-[9px] w-[7px] rounded-[1px] border" />
              )}
            </span>
            <span
              className={
                row.kind === "folder" ? "font-semibold" : "font-normal"
              }
            >
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserActivityViz() {
  const events = [
    { i: "AC", t: "approved PO-12480", m: "2m ago" },
    { i: "JM", t: "edited Role · Buyer", m: "14m ago" },
    { i: "MR", t: "received GRN-8821", m: "38m ago" },
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-1.5">
        {events.map((e, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 px-1 py-1.5 ${
              i === events.length - 1 ? "" : "border-border-subtle border-b"
            }`}
          >
            <span
              className="inline-flex size-4 items-center justify-center rounded-full text-[0.5rem] font-semibold"
              style={{
                background:
                  "color-mix(in oklch, var(--primary), var(--card) 80%)",
                color: ACCENT,
              }}
            >
              {e.i}
            </span>
            <span className="text-foreground flex-1 text-[0.5625rem] leading-snug">
              <span className="font-bold">{e.i}</span> {e.t}
            </span>
            <span className="text-muted-foreground text-[0.5rem]">{e.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitorViz() {
  const points = [
    12, 18, 22, 16, 28, 24, 32, 28, 36, 30, 28, 22, 26, 34, 30, 38, 42, 36,
  ];
  const max = Math.max(...points);
  const w = 240;
  const h = 70;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p / max) * h}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const lastX = (points.length - 1) * stepX;
  const lastY = h - (points[points.length - 1] / max) * h;
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted-foreground text-[0.5625rem] font-semibold tracking-wider uppercase">
            CPU · last 30m
          </span>
          <span
            className="text-[0.6875rem] font-bold"
            style={{ color: ACCENT }}
          >
            34%
          </span>
        </div>
        <svg
          viewBox={`0 0 ${w} ${h + 6}`}
          preserveAspectRatio="none"
          className="h-10 w-full"
          aria-hidden
        >
          <path
            d={area}
            fill={"color-mix(in oklch, var(--primary), var(--card) 78%)"}
          />
          <path
            d={path}
            stroke={ACCENT}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={lastX} cy={lastY} r="2.5" fill={ACCENT} />
        </svg>
      </div>
    </div>
  );
}

function EmailViz() {
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-foreground text-[0.5625rem] font-semibold">
            mail.aureliabay.com
          </span>
          <span className="text-positive inline-flex items-center gap-1 text-[0.5rem] font-semibold">
            <span className="bg-positive inline-block size-1.5 rounded-full" />{" "}
            Connected
          </span>
        </div>
        <div className="text-muted-foreground grid grid-cols-2 gap-1 text-[0.5rem]">
          <div className="bg-muted rounded-[1px] px-1.5 py-1">
            SMTP · 587 TLS
          </div>
          <div className="bg-muted rounded-[1px] px-1.5 py-1">DKIM · ok</div>
          <div className="bg-muted rounded-[1px] px-1.5 py-1">SPF · ok</div>
          <div
            className="rounded-[1px] px-1.5 py-1 font-bold"
            style={{
              background:
                "color-mix(in oklch, var(--primary), var(--card) 80%)",
              color: ACCENT,
            }}
          >
            4 templates
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifyViz() {
  const templates = [
    { n: "Approval Required", e: "onApprove", c: "Email" },
    { n: "Request Submitted", e: "onSubmit", c: "System" },
    { n: "PR Rejected", e: "onReject", c: "Email" },
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-1.5">
        {templates.map((tpl, i) => (
          <div
            key={tpl.n}
            className={`flex items-center gap-1.5 px-1 py-1.5 ${
              i === templates.length - 1 ? "" : "border-border-subtle border-b"
            }`}
          >
            <span
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full"
              style={{
                background:
                  "color-mix(in oklch, var(--primary), var(--card) 80%)",
              }}
              aria-hidden
            >
              <svg viewBox="0 0 16 16" className="size-2.5" fill="none">
                <path
                  d="M8 3 C 5.8 3 5 4.4 5 6.3 C 5 8.5 4 9.6 4 9.6 H 12 C 12 9.6 11 8.5 11 6.3 C 11 4.4 10.2 3 8 3 Z"
                  fill={ACCENT}
                />
                <circle cx="8" cy="11.4" r="1" fill={ACCENT} />
              </svg>
            </span>
            <span className="text-foreground flex-1 truncate text-[0.625rem] font-semibold">
              {tpl.n}
            </span>
            <span
              className="rounded-sm px-1 py-0.5 text-[0.5rem] font-semibold"
              style={{
                background:
                  "color-mix(in oklch, var(--primary), var(--card) 80%)",
                color: ACCENT,
              }}
            >
              {tpl.e}
            </span>
            <span className="text-muted-foreground text-[0.5rem] font-semibold">
              {tpl.c}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeViz() {
  const lines = [
    {
      p: "cron · 0 2 * * *",
      color: "var(--muted-foreground)",
      bold: false,
      prefix: "  ",
    },
    {
      p: "sync_vendor_prices.js",
      color: "var(--primary-foreground)",
      bold: true,
      prefix: "$ ",
    },
    { p: "→ 1,284 rows updated", color: ACCENT, bold: false, prefix: "  " },
    {
      p: "→ done · 4.2s",
      color: "var(--muted-foreground)",
      bold: false,
      prefix: "  ",
    },
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-foreground rounded-sm p-2">
        <div className="mb-1.5 flex gap-1" aria-hidden>
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: "#ff5f57" }}
          />
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: "#febc2e" }}
          />
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: "#28c840" }}
          />
        </div>
        {lines.map((l, i) => (
          <div
            key={i}
            className="text-[0.5625rem] leading-snug"
            style={{ color: l.color, fontWeight: l.bold ? 700 : 400 }}
          >
            {l.prefix}
            {l.p}
          </div>
        ))}
      </div>
    </div>
  );
}

function QueryViz() {
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border p-2">
        <div className="text-foreground text-[0.5625rem] leading-relaxed">
          <div>
            <span className="font-bold" style={{ color: ACCENT }}>
              SELECT
            </span>{" "}
            vendor,{" "}
            <span className="font-bold" style={{ color: ACCENT }}>
              SUM
            </span>
            (total)
          </div>
          <div>
            <span className="font-bold" style={{ color: ACCENT }}>
              FROM
            </span>{" "}
            purchase_orders
          </div>
          <div>
            <span className="font-bold" style={{ color: ACCENT }}>
              WHERE
            </span>{" "}
            period{" "}
            <span className="font-bold" style={{ color: ACCENT }}>
              =
            </span>{" "}
            <span className="text-positive">{`'2026-05'`}</span>
          </div>
          <div>
            <span className="font-bold" style={{ color: ACCENT }}>
              GROUP BY
            </span>{" "}
            vendor;
          </div>
        </div>
        <div className="border-border-subtle mt-1.5 flex items-center justify-between border-t pt-1">
          <span className="text-muted-foreground text-[0.5rem]">
            184 rows · 1.2s
          </span>
          <span
            className="rounded-[1px] px-1.5 py-0.5 text-[0.5rem] font-semibold"
            style={{
              background:
                "color-mix(in oklch, var(--primary), var(--card) 80%)",
              color: ACCENT,
            }}
          >
            Save
          </span>
        </div>
      </div>
    </div>
  );
}

function DatasetViz() {
  const cols = [
    { n: "vendor_id", t: "string", pk: true },
    { n: "period", t: "date", pk: false },
    { n: "total_thb", t: "number", pk: false },
    { n: "doc_count", t: "int", pk: false },
  ];
  return (
    <div className={VIZ_WRAP}>
      <div className="bg-card border-border rounded-sm border px-2 py-1.5">
        <div className="border-border-subtle flex items-center justify-between border-b pb-1">
          <span className="text-foreground text-[0.5625rem] font-semibold">
            vendor_spend_monthly
          </span>
          <span
            className="rounded-[1px] px-1.5 py-0.5 text-[0.5rem] font-semibold"
            style={{
              background:
                "color-mix(in oklch, var(--primary), var(--card) 80%)",
              color: ACCENT,
            }}
          >
            fresh
          </span>
        </div>
        {cols.map((c, i) => (
          <div
            key={c.n}
            className={`grid grid-cols-[0.875rem_1fr_auto] items-center gap-1.5 py-1 ${
              i === cols.length - 1 ? "" : "border-border-subtle border-b"
            }`}
          >
            <span
              className="rounded-[1px] px-0.5 py-px text-center text-[0.4375rem] font-bold"
              style={
                c.pk
                  ? {
                      background:
                        "color-mix(in oklch, var(--primary), var(--card) 80%)",
                      color: ACCENT,
                    }
                  : {
                      background: "transparent",
                      color: "var(--muted-foreground)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {c.pk ? "PK" : "·"}
            </span>
            <span className="text-foreground text-[0.5625rem]">{c.n}</span>
            <span className="text-muted-foreground text-[0.5rem]">{c.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
