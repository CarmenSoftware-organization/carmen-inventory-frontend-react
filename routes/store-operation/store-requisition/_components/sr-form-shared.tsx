export const PlainValue = ({
  value,
  multiline,
}: {
  readonly value?: string;
  readonly multiline?: boolean;
}) => (
  <div
    className={`text-sm ${multiline ? "whitespace-pre-wrap" : "truncate"} py-2`}
    title={value || undefined}
  >
    {value ? (
      <span className="font-semibold">{value}</span>
    ) : (
      <span className="text-muted-foreground font-normal">—</span>
    )}
  </div>
);

export const SummaryRow = ({
  label,
  value,
  last,
}: {
  readonly label: string;
  readonly value: number | string;
  readonly last?: boolean;
}) => (
  <div
    className={`flex items-center justify-between py-1.5 text-[0.625rem] ${
      last ? "" : "border-b"
    }`}
  >
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium tabular-nums">{value}</span>
  </div>
);

export const LocationTile = ({
  label,
  name,
  code,
  highlighted,
}: {
  readonly label: string;
  readonly name: string;
  readonly code: string;
  readonly highlighted?: boolean;
}) => (
  <div
    title={name || undefined}
    className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-md border px-3 py-2.5 ${
      highlighted
        ? "border-success/30 bg-success/5"
        : "border-warning bg-warning/40"
    }`}
  >
    <span
      className={`text-[0.625rem] font-semibold tracking-wider uppercase ${
        highlighted ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </span>
    <span className="line-clamp-2 text-[0.8125rem] leading-tight font-medium wrap-break-word">
      {name || "—"}
    </span>
    {code && (
      <span className="text-muted-foreground truncate text-[0.625rem]">
        {code}
      </span>
    )}
  </div>
);
