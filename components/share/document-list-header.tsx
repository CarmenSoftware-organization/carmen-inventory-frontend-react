interface DocumentListHeaderProps {
  title: string;
  description: string;
}

export function DocumentListHeader({
  title,
  description,
}: DocumentListHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
    </div>
  );
}
