import { cn } from "@/lib/utils";

export function EyeBrow({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "text-primary mb-2 text-[0.625rem] font-bold tracking-[0.16em] uppercase",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="bg-primary mr-2 inline-block h-[1.5px] w-4.5 align-middle"
      />
      {children}
    </div>
  );
}
