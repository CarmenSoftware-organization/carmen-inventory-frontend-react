// components/form/form-section.tsx
import { ReactNode } from "react";

interface FormSectionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function NotesSection({
  title,
  subtitle,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={["space-y-3 pt-2", className].filter(Boolean).join(" ")}
    >
      <div className="space-y-0.5 pb-2">
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
