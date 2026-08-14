import { Plus, RefreshCw, Sparkles, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CHANGELOG, type ChangeItem, type VersionEntry } from "@/lib/changelog";

interface WhatsNewDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  {
    key: "added",
    label: "Added",
    Icon: Plus,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
  },
  {
    key: "fixed",
    label: "Fixed",
    Icon: Wrench,
    colorClass: "text-rose-500",
    bgClass: "bg-rose-500/10",
  },
  {
    key: "changed",
    label: "Changed",
    Icon: RefreshCw,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
  },
] as const;

function ChangeList({
  items,
  colorClass,
}: {
  readonly items: readonly ChangeItem[];
  colorClass: string;
}) {
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item) => (
        <li
          key={item.hash}
          className="flex items-start gap-3 text-sm leading-relaxed"
        >
          <div
            className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${colorClass.replace("text-", "bg-")}`}
          />
          <div>
            {item.scope && (
              <span className="bg-muted text-micro-legal text-muted-foreground mr-2 mb-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 font-bold tracking-wider uppercase">
                {item.scope}
              </span>
            )}
            <span className="text-foreground/90 font-medium">
              {item.summary}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VersionBlock({ entry }: { readonly entry: VersionEntry }) {
  const sections = SECTIONS.filter(({ key }) => entry.changes[key].length > 0);
  return (
    <section className="border-muted/60 relative border-l-2 pb-10 pl-6 last:pb-2">
      {/* Timeline dot */}
      <div className="bg-primary ring-background absolute top-1.5 -left-[5px] h-2 w-2 rounded-full ring-4" />

      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-foreground text-xl font-bold tracking-tight">
          v{entry.version}
        </h3>
        <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
          {entry.date}
        </span>
      </div>
      {sections.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          {entry.note === "init" ? "Initial release." : "No notable changes."}
        </p>
      ) : (
        <div className="space-y-7">
          {sections.map(({ key, label, Icon, colorClass, bgClass }) => (
            <div key={key}>
              <div
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold ${bgClass} ${colorClass}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="tracking-wider uppercase">{label}</span>
              </div>
              <ChangeList items={entry.changes[key]} colorClass={colorClass} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Dialog แสดง "What's New" / changelog ให้ผู้ใช้
 *
 * Render ทุก version จาก `changelog.json` (ล่าสุดอยู่บนสุด) แต่ละ version
 * จัดกลุ่มเป็น Added / Fixed / Changed พร้อม icon และ scope chip โดย
 * **ไม่แสดง** git hash / author / PR เพื่อให้อ่านง่ายสำหรับผู้ใช้ทั่วไป
 * เป็น controlled component — ตัวเรียกใช้คุม `open` / `onOpenChange`
 *
 * @param props - `open` สถานะเปิด, `onOpenChange` callback เมื่อสถานะเปลี่ยน
 * @returns JSX element ของ dialog
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <WhatsNewDialog open={open} onOpenChange={setOpen} />
 * ```
 */
export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden border-0 bg-transparent p-0 shadow-2xl sm:max-w-4xl"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] backdrop-blur-3xl dark:border-white/20 dark:bg-zinc-900/80 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
          {/* Header */}
          <div className="border-b border-white/60 bg-white/60 px-6 py-6 dark:border-white/10 dark:bg-black/40">
            <div className="flex items-center gap-4">
              <div className="text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-white/10">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  What&apos;s New
                </DialogTitle>
                <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Recent updates to CARMEN BLUE.
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white/50 px-6 py-6 dark:bg-black/40">
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
              {CHANGELOG.versions.map((entry) => (
                <VersionBlock key={entry.build} entry={entry} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-white/60 bg-white/70 px-6 py-4 dark:border-white/10 dark:bg-black/50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-white/80 bg-white/90 font-bold shadow-sm backdrop-blur-md transition-all hover:bg-white dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
