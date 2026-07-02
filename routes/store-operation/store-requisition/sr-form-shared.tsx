export const PlainValue = ({
  value,
  multiline,
}: {
  readonly value?: string;
  readonly multiline?: boolean;
}) => (
  <div
    className={
      multiline
        ? "min-h-8 py-1.5 text-sm whitespace-pre-wrap"
        : "block min-h-8 truncate text-sm leading-8"
    }
    title={value || undefined}
  >
    {value ? (
      <span className="text-foreground font-medium">{value}</span>
    ) : (
      <span className="text-muted-foreground font-normal">—</span>
    )}
  </div>
);
