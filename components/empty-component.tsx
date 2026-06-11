
import { useTranslations } from "use-intl";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function EmptyIllustration() {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-fade-in"
      aria-hidden="true"
    >
      {/* Folder back */}
      <rect
        x="8"
        y="14"
        width="48"
        height="30"
        rx="3"
        className="fill-muted stroke-border"
        strokeWidth="1.5"
      />
      {/* Folder tab */}
      <path
        d="M8 17a3 3 0 013-3h12l3 4h27a3 3 0 013 3v0H8v-4z"
        className="fill-muted/80 stroke-border"
        strokeWidth="1.5"
      />
      {/* Document lines */}
      <rect
        x="20"
        y="26"
        width="24"
        height="2"
        rx="1"
        className="fill-muted-foreground/15"
      />
      <rect
        x="24"
        y="32"
        width="16"
        height="2"
        rx="1"
        className="fill-muted-foreground/10"
      />
      {/* Floating circle accent */}
      <circle
        cx="50"
        cy="12"
        r="4"
        className="fill-primary/15 animate-pulse-soft"
      />
      <circle
        cx="14"
        cy="10"
        r="2.5"
        className="fill-primary/10 animate-pulse-soft"
        style={{ animationDelay: "1s" }}
      />
    </svg>
  );
}

interface EmptyComponentProps {
  readonly icon?: LucideIcon;
  readonly title?: string;
  readonly description?: React.ReactNode;
  readonly content?: React.ReactNode;
  readonly classNames?: string;
}

export default function EmptyComponent({
  icon: Icon,
  title,
  description,
  content,
  classNames,
}: EmptyComponentProps) {
  const t = useTranslations("common");
  return (
    <div
      className={cn(
        "animate-fade-in-up flex flex-col items-center justify-center gap-1.5 py-6 text-center",
        classNames,
      )}
    >
      {Icon ? (
        <Icon className="text-muted-foreground/40 size-10 stroke-[1.2]" />
      ) : (
        <EmptyIllustration />
      )}
      <p className="text-muted-foreground text-xs font-medium">
        {title ?? t("noDataFound")}
      </p>
      {description && (
        <p className="text-muted-foreground/60 text-xs">{description}</p>
      )}
      {content && <div className="mt-2 flex items-center gap-2">{content}</div>}
    </div>
  );
}
