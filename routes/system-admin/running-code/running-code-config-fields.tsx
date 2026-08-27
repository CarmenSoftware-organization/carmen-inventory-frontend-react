import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { format as formatDate } from "date-fns";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseConfig,
  previewCode,
  serializeConfig,
  type CodePart,
  type PartKind,
} from "./running-code-config";

/** รูปแบบวันที่ที่ให้เลือก — ป้ายคือ "ตัวอย่างของวันนี้" ไม่ใช่ชื่อรูปแบบ */
const DATE_PATTERNS = ["yyMM", "yyyyMM", "yy", "yyyy", "yyMMdd", "yyyyMMdd"];

interface Props {
  /** ค่า config เป็นข้อความ JSON (แหล่งความจริงเดียวกับโหมดขั้นสูง) */
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly disabled?: boolean;
}

/**
 * ตัวแก้ config ของ running code แบบ "ต่อชิ้นส่วน" แทนการพิมพ์ JSON
 *
 * คนที่ตั้งเลขเอกสารคือแอดมินของโรงแรม ไม่ใช่ dev — `running(5, '0')` กับ
 * `{A}{B}{C}` ไม่มีทางเดาความหมายได้ ฟอร์มนี้เลยให้เลือกทีละชิ้น (ตัวอักษรคงที่ ·
 * วันที่ · เลขลำดับ · ค่าจากข้อมูล) แล้ว**โชว์ตัวอย่างเลขจริงตลอดเวลา** ซึ่งเป็น
 * สิ่งเดียวที่คนหน้างานใช้ตัดสินว่าตั้งถูกหรือยัง
 *
 * ยัง sync กับช่อง JSON ขั้นสูงตัวเดิมอยู่ — ทั้งสองอ่าน/เขียน `value` ตัวเดียวกัน
 * แก้ทางไหนอีกทางเห็นทันที
 *
 * อ่าน config ไม่ออก (รูปแบบแปลกไปจากที่รู้จัก) = ไม่ render อะไรเลย ปล่อยให้แก้
 * ทาง JSON ดีกว่าเดาแล้วเขียนทับของเดิมพัง
 */
export function RunningCodeConfigFields({ value, onChange, disabled }: Props) {
  const t = useTranslations("systemAdmin.runningCode");
  const tc = useTranslations("common");
  const now = useMemo(() => new Date(), []);

  const parsed = useMemo(() => {
    try {
      return parseConfig(JSON.parse(value?.trim() || "{}"));
    } catch {
      return null; // JSON พัง — ช่องขั้นสูงจะฟ้องเอง
    }
  }, [value]);

  if (!parsed) return null;

  const { parts, extra } = parsed;
  const commit = (next: CodePart[]) =>
    onChange(JSON.stringify(serializeConfig(next, extra), null, 2));

  const patch = (index: number, changes: Partial<CodePart>) =>
    commit(parts.map((p, i) => (i === index ? { ...p, ...changes } : p)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= parts.length) return;
    const next = [...parts];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const KIND_LABEL: Record<PartKind, string> = {
    text: t("partText"),
    date: t("partDate"),
    running: t("partRunning"),
    token: t("partToken"),
  };

  return (
    <div className="space-y-3">
      {/* ตัวอย่างมาก่อนช่องกรอก — คนอ่านจากบนลงล่าง เห็นผลลัพธ์ก่อนแล้วค่อยเห็น
          ว่าอะไรทำให้เป็นแบบนั้น ไม่ใช่กรอกจนจบแล้วค่อยรู้ว่าได้อะไร */}
      <div className="bg-muted/40 border-border/60 rounded-lg border px-3 py-2">
        <div className="text-muted-foreground text-micro">
          {t("previewLabel")}
        </div>
        <div className="text-foreground font-mono text-sm font-semibold">
          {parts.length > 0 ? previewCode(parts, now) : "—"}
        </div>
      </div>

      <div className="space-y-2">
        {parts.map((part, index) => (
          <div
            // ตำแหน่งคือ identity จริง ๆ ของแถวนี้ — ชื่อช่อง A/B/C ฝั่ง backend ก็ไล่
            // ตามตำแหน่งเหมือนกัน ไม่มี id อื่นให้ใช้และไม่ควรสร้างขึ้นมาเอง
            key={index}
            className="border-border/60 flex flex-wrap items-center gap-2 rounded-lg border p-2"
          >
            <Select
              value={part.kind}
              onValueChange={(kind) => patch(index, { kind: kind as PartKind })}
              disabled={disabled}
            >
              <SelectTrigger size="xs" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABEL) as PartKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {part.kind === "text" && (
              <Input
                value={part.text ?? ""}
                onChange={(e) => patch(index, { text: e.target.value })}
                placeholder={t("partTextPlaceholder")}
                disabled={disabled}
                className="h-6 w-28 text-xs"
                maxLength={20}
              />
            )}

            {part.kind === "date" && (
              <Select
                value={part.pattern ?? "yyMM"}
                onValueChange={(pattern) => patch(index, { pattern })}
                disabled={disabled}
              >
                <SelectTrigger size="xs" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* โชว์ทั้งชื่อรูปแบบและตัวอย่างของวันนี้ — ชื่อรูปแบบไว้ให้คนที่
                      รู้อยู่แล้วเทียบกับของเดิมได้ ตัวอย่างไว้ให้คนที่ไม่รู้เลือก
                      รูปร่างที่อยากได้ · รูปแบบเดิมที่ไม่อยู่ในลิสต์ถูกใส่เพิ่มไว้
                      ไม่งั้นเปิดมาแล้วโดนเปลี่ยนเงียบ ๆ */}
                  {[...new Set([...DATE_PATTERNS, part.pattern ?? "yyMM"])].map(
                    (p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground font-mono">
                            {p}
                          </span>
                          <span className="text-muted-foreground/60">-</span>
                          <span>
                            {(() => {
                              try {
                                return formatDate(now, p);
                              } catch {
                                return p;
                              }
                            })()}
                          </span>
                        </span>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}

            {part.kind === "running" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={part.digits ?? 4}
                  onChange={(e) =>
                    patch(index, { digits: Number(e.target.value) || 1 })
                  }
                  disabled={disabled}
                  className="h-6 w-14 text-xs"
                />
                <span className="text-muted-foreground text-micro">
                  {t("partRunningDigits")}
                </span>
              </div>
            )}

            {part.kind === "token" && (
              <Input
                value={part.token ?? ""}
                onChange={(e) => patch(index, { token: e.target.value })}
                placeholder={t("partTokenPlaceholder")}
                disabled={disabled}
                className="h-6 w-44 text-xs"
              />
            )}

            <div className="ms-auto flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => move(index, -1)}
                disabled={disabled || index === 0}
                aria-label={t("partMoveUp")}
              >
                <ChevronUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => move(index, 1)}
                disabled={disabled || index === parts.length - 1}
                aria-label={t("partMoveDown")}
              >
                <ChevronDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => commit(parts.filter((_, i) => i !== index))}
                disabled={disabled}
                aria-label={tc("delete")}
                className="text-muted-foreground hover:text-destructive"
              >
                <X />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => commit([...parts, { kind: "text", text: "" }])}
          disabled={disabled}
        >
          <Plus />
          {t("addPart")}
        </Button>
      </div>
    </div>
  );
}
