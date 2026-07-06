interface NameWithSubtextProps {
  primary: string;
  secondary?: string;
}

export function NameWithSubtext({ primary, secondary }: NameWithSubtextProps) {
  return (
    <div className="group w-full text-left">
      <p className="truncate font-semibold">{primary || "—"}</p>
      {secondary && (
        <p className="text-muted-foreground truncate text-[0.625rem]">
          {secondary}
        </p>
      )}
    </div>
  );
}
