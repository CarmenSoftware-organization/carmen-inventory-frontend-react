import { useTranslations } from "use-intl";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import type { WidgetDisplay, WidgetType } from "@/types/dashboard-widget";

/** สีที่เลือกให้ threshold ได้ — token ของธีม ไม่ใช่ hex เพื่อให้ dark mode ตามด้วย */
const THRESHOLD_COLORS = [
  "var(--chart-4)",
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--destructive)",
] as const;

/** ความกว้างที่เลือกได้บนกริด 12 คอลัมน์ — เศษส่วนที่คนคิดถึงจริง ๆ ไม่ใช่ทั้ง 12 ค่า */
const WIDTHS = [3, 4, 6, 8, 9, 12] as const;
/** ความสูงเป็นจำนวนแถว (1 แถว = 4rem) */
const HEIGHTS = [2, 3, 4, 6] as const;

interface WidgetDisplayFieldsProps {
  readonly widgetType: WidgetType;
  readonly value: WidgetDisplay;
  readonly onChange: (next: WidgetDisplay) => void;
  readonly disabled?: boolean;
}

/**
 * ฟอร์มการแสดงผลของ widget — ฟิลด์ที่ขึ้นกับชนิดกราฟ (min/max ของ gauge, ความสูง
 * ของกราฟ) จะโผล่เฉพาะกับชนิดที่ใช้จริง ส่วนความกว้างใช้ได้กับทุกชนิด
 *
 * ค่าว่างแปลว่า "ไม่ตั้ง" ไม่ใช่ 0 — ส่ง `undefined` กลับไปเพื่อให้ key นั้นหายจาก
 * jsonb ที่บันทึก ไม่ใช่บันทึกเลข 0 ที่ทำให้ gauge สเกลพัง
 */
export function WidgetDisplayFields({
  widgetType,
  value,
  onChange,
  disabled,
}: WidgetDisplayFieldsProps) {
  const t = useTranslations("dashboard.savedWidget.display");
  const isGauge = widgetType === "gauge";

  const set = (patch: Partial<WidgetDisplay>) =>
    onChange({ ...value, ...patch });
  const num = (raw: string): number | undefined =>
    raw.trim() === "" ? undefined : Number(raw);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel>{t("width")}</FieldLabel>
        <FieldSelect
          value={String(value.width ?? "")}
          onValueChange={(v) => set({ width: Number(v) })}
          disabled={disabled}
          className="h-8 text-sm"
        >
          <SelectContent>
            {WIDTHS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                {t(`widthOption.${w}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </FieldSelect>
      </Field>

      <Field>
        <FieldLabel>{t("height")}</FieldLabel>
        <FieldSelect
          value={String(value.height ?? "")}
          onValueChange={(v) => set({ height: Number(v) })}
          disabled={disabled}
          className="h-8 text-sm"
        >
          <SelectContent>
            {HEIGHTS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {t(`heightOption.${h}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </FieldSelect>
      </Field>

      {widgetType !== "table" && (
        <Field>
          <FieldLabel htmlFor="widget-display-decimals">
            {t("decimals")}
          </FieldLabel>
          <FieldInput
            id="widget-display-decimals"
            type="number"
            min={0}
            max={4}
            value={value.decimals ?? ""}
            onChange={(e) => set({ decimals: num(e.target.value) })}
            disabled={disabled}
          />
        </Field>
      )}

      {isGauge && (
        <>
          <Field>
            <FieldLabel htmlFor="widget-display-min">{t("min")}</FieldLabel>
            <FieldInput
              id="widget-display-min"
              type="number"
              value={value.min ?? ""}
              onChange={(e) => set({ min: num(e.target.value) })}
              disabled={disabled}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="widget-display-max">{t("max")}</FieldLabel>
            <FieldInput
              id="widget-display-max"
              type="number"
              value={value.max ?? ""}
              onChange={(e) => set({ max: num(e.target.value) })}
              disabled={disabled}
              placeholder={t("maxPlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="widget-display-threshold">
              {t("threshold")}
            </FieldLabel>
            <FieldInput
              id="widget-display-threshold"
              type="number"
              value={value.thresholds?.[0]?.value ?? ""}
              onChange={(e) => {
                const v = num(e.target.value);
                set({
                  thresholds:
                    v === undefined
                      ? undefined
                      : [
                          {
                            value: v,
                            color:
                              value.thresholds?.[0]?.color ??
                              THRESHOLD_COLORS[0],
                          },
                        ],
                });
              }}
              disabled={disabled}
            />
          </Field>
          <Field>
            <FieldLabel>{t("thresholdColor")}</FieldLabel>
            <FieldSelect
              value={value.thresholds?.[0]?.color ?? THRESHOLD_COLORS[0]}
              onValueChange={(color) =>
                set({
                  thresholds: [
                    { value: value.thresholds?.[0]?.value ?? 0, color },
                  ],
                })
              }
              disabled={disabled || !value.thresholds?.length}
              className="h-8 text-sm"
            >
              <SelectContent>
                {THRESHOLD_COLORS.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                      {t(`color.${c.replace(/var\(--|\)/g, "")}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          </Field>
        </>
      )}
    </div>
  );
}
