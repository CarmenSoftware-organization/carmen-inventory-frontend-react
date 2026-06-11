import Link from "@/lib/compat/link";
import { useTranslations } from "use-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVisibleModules } from "@/hooks/use-visible-modules";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { cn } from "@/lib/utils";
import { AppTile } from "@/components/icons/tiles";
import { AppLauncherIcon } from "@/components/icons/app-launcher-icon";

export default function ModuleApp() {
  const t = useTranslations("modules");
  const tn = useTranslations("navbar");
  const [open, setOpen] = useState(false);

  const visibleModules = useVisibleModules();

  // Modifier symbol for the shortcut hint (⌘ on macOS, Ctrl elsewhere).
  // Computed at render — the tooltip is client-only so the SSR fallback never shows.
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={tn("modules")}>
          <AppLauncherIcon className="size-4" />
          <span className="sr-only">{tn("modules")}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="border-border/70 bg-popover w-80 overflow-hidden rounded-2xl border p-0 shadow-[0_24px_60px_rgba(10,10,10,0.18),0_4px_12px_rgba(10,10,10,0.08)]"
      >
        {/* Tile grid — 3 cols, no header */}
        <div className="grid grid-cols-3 gap-0 px-1.5 pt-2 pb-3">
          {visibleModules.map((mod) => (
            <LauncherTile
              key={mod.path}
              name={mod.name}
              path={mod.path}
              label={t(mod.name)}
              denied={mod.denied}
              permission={mod.permission}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>

        {/* Shortcut hint — static display */}
        <div className="border-border/60 text-muted-foreground flex items-center justify-center gap-1.5 border-t py-2 text-[0.6875rem]">
          <span>{tn("shortcutOpen")}</span>
          <span className="flex items-center gap-1">
            <HintKey>{modKey}</HintKey>
            <HintKey>K</HintKey>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** kbd chip for the shortcut hint */
function HintKey({ children }: { readonly children: React.ReactNode }) {
  return (
    <kbd className="bg-muted inline-flex h-4 min-w-4 items-center justify-center rounded border px-1.5 text-[0.625rem] font-medium">
      {children}
    </kbd>
  );
}

interface LauncherTileProps {
  readonly name: string;
  readonly path: string;
  readonly label: string;
  readonly denied: boolean;
  readonly permission?: import("@/constant/permissions").Permission;
  readonly onNavigate: () => void;
}

const LauncherTile = ({
  name,
  path,
  label,
  denied,
  permission,
  onNavigate,
}: LauncherTileProps) => {
  const tileClass = cn(
    "group/tile flex min-h-22.5 flex-col items-center justify-start gap-2 rounded-xl px-1 pt-3 pb-2.5",
    "hover:bg-muted/60 focus-visible:bg-muted/60 transition-colors",
    "focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
    denied && "opacity-50",
  );

  const content = (
    <>
      <span className="transition-transform group-hover/tile:scale-105">
        <AppTile name={name} size={44} />
      </span>
      <span className="text-foreground/80 max-w-full text-center text-xs leading-tight font-medium wrap-break-word">
        {label}
      </span>
    </>
  );

  // Denied → button (no anchor → NextTopLoader's anchor click listener doesn't trigger)
  if (denied) {
    return (
      <button
        type="button"
        onClick={() => dispatchPermissionDenied(permission)}
        aria-disabled
        className={tileClass}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={path} onClick={onNavigate} className={tileClass}>
      {content}
    </Link>
  );
};
