import { ModuleTileIcon } from "@/components/ui/module-tile";

interface DisplayTemplateProps {
  readonly title: string;
  readonly description?: string;
  readonly toolbar?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly filterBar?: React.ReactNode;
  readonly children: React.ReactNode;
}

export default function DisplayTemplate({
  title,
  description,
  toolbar,
  actions,
  filterBar,
  children,
}: DisplayTemplateProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <ModuleTileIcon />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      {(toolbar || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2">{toolbar}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      )}
      {filterBar}
      {children}
    </div>
  );
}
