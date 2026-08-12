
import { Plus, RefreshCw, Sparkles, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CHANGELOG, type ChangeItem, type VersionEntry } from "@/lib/changelog";

interface WhatsNewDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  { key: "added", label: "Added", Icon: Plus, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
  { key: "fixed", label: "Fixed", Icon: Wrench, colorClass: "text-rose-500", bgClass: "bg-rose-500/10" },
  { key: "changed", label: "Changed", Icon: RefreshCw, colorClass: "text-blue-500", bgClass: "bg-blue-500/10" },
] as const;

function ChangeList({ items, colorClass }: { readonly items: readonly ChangeItem[], colorClass: string }) {
  return (
    <ul className="space-y-2.5 mt-3">
      {items.map((item) => (
        <li key={item.hash} className="flex items-start gap-3 text-sm leading-relaxed">
          <div className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${colorClass.replace('text-', 'bg-')}`} />
          <div>
            {item.scope && (
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-micro-legal font-bold text-muted-foreground mr-2 mb-0.5 uppercase tracking-wider">
                {item.scope}
              </span>
            )}
            <span className="text-foreground/90 font-medium">{item.summary}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VersionBlock({ entry }: { readonly entry: VersionEntry }) {
  const sections = SECTIONS.filter(({ key }) => entry.changes[key].length > 0);
  return (
    <section className="relative pl-6 border-l-2 border-muted/60 pb-10 last:pb-2">
      {/* Timeline dot */}
      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
      
      <div className="flex items-center justify-between gap-4 mb-5">
        <h3 className="text-xl font-bold tracking-tight text-foreground">v{entry.version}</h3>
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {entry.date}
        </span>
      </div>
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {entry.note === "init" ? "Initial release." : "No notable changes."}
        </p>
      ) : (
        <div className="space-y-7">
          {sections.map(({ key, label, Icon, colorClass, bgClass }) => (
            <div key={key}>
              <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold ${bgClass} ${colorClass}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="uppercase tracking-wider">{label}</span>
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
        className="sm:max-w-4xl p-0 border-0 overflow-hidden bg-transparent shadow-2xl"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-white/80 dark:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
          {/* Header */}
          <div className="px-6 py-6 border-b border-white/60 dark:border-white/10 bg-white/60 dark:bg-black/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 dark:bg-white/10 text-primary shadow-sm border border-white/80 dark:border-white/20 backdrop-blur-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  What&apos;s New
                </DialogTitle>
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  Recent updates to CARMEN BLUE.
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 bg-white/50 dark:bg-black/40">
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
              {CHANGELOG.versions.map((entry) => (
                <VersionBlock key={entry.build} entry={entry} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end border-t border-white/60 dark:border-white/10 bg-white/70 dark:bg-black/50">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="rounded-xl bg-white/90 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 border border-white/80 dark:border-white/20 font-bold backdrop-blur-md shadow-sm transition-all"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
