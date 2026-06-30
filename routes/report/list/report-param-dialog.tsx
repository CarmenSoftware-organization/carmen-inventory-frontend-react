
import { useRef, useState } from "react";
import { useTranslations } from "use-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDatePicker,
  FieldGroup,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LookupCombobox } from "@/components/lookup/lookup-combobox";
import { useReportListLookups } from "@/hooks/use-report";
import type {
  ReportPeriodMap,
} from "@/types/report";
import type { Report } from "@/types/report";
import {
  parseReportDialog,
  type DateNode,
  type FormField,
  type LookupNode,
} from "./parse-report-dialog";

interface ReportParamDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly report: Report | null;
  readonly buCode?: string;
  readonly onRun?: (report: Report, filters: Record<string, string>) => void;
}

/**
 * แปลง keyword ของวันที่ (เช่น Today, FirstDayOfMonth, @current_period)
 * เป็นค่าวันที่จริงในรูปแบบ ISO string
 *
 * @param value - keyword หรือค่าวันที่ต้นฉบับ
 * @param periods - ข้อมูล period สำหรับ resolve keyword ที่เกี่ยวกับงวด
 * @returns ISO date string
 */
function resolveDateKeyword(value: string, periods?: ReportPeriodMap): string {
  const now = new Date();
  switch (value) {
    case "Today":
    case "@today":
    case "@now":
      return now.toISOString();
    case "@yesterday":
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      ).toISOString();
    case "@tommorow":
    case "@tomorrow":
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      ).toISOString();
    case "FirstDayOfMonth":
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case "LastDayOfMonth":
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    case "FirstDayOfYear":
      return new Date(now.getFullYear(), 0, 1).toISOString();
    case "LastDayOfYear":
      return new Date(now.getFullYear(), 11, 31).toISOString();
    case "@current_period":
      return (
        periods?.["current-period"]?.start_at ??
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      );
    case "@previous_period":
      return (
        periods?.["previous-period"]?.start_at ??
        new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      );
    case "@blank":
    case "@empty":
    case "@none":
      // Opt-out of the today-default: control starts empty (no date filter).
      // Used by reports with several optional date ranges (e.g. Store Requisition
      // Detail) so the user only fills the ranges they care about.
      return "";
    default:
      return value || now.toISOString();
  }
}

interface LookupControlProps {
  readonly node: LookupNode;
  readonly id: string;
}

interface LookupOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Searchable single-select lookup for long, data-source-backed lists
 * (product / location / vendor / category / period ...). Filters on the label
 * ("code - name") so the user can type either the code or the name.
 *
 * Drives a hidden input so the native <form> FormData picks the value up, the
 * same way DateControlInner does. Defaults to the first option ("ALL") to match
 * the previous <select> behaviour.
 *
 * @param options - resolved value/label options (first is the ALL sentinel)
 * @param id - form field name submitted in the filters payload
 * @returns JSX element ของ searchable lookup
 */
function SearchableLookupControl({
  options,
  id,
}: {
  readonly options: LookupOption[];
  readonly id: string;
}) {
  const [value, setValue] = useState(options[0].value);
  return (
    <>
      <input type="hidden" name={id} value={value} readOnly />
      <LookupCombobox<LookupOption>
        value={value}
        onValueChange={(v) => setValue(v)}
        items={options}
        getId={(o) => o.value}
        getLabel={(o) => o.label}
        getSearchValue={(o) => o.label}
        // The Product/Location fields sit in a 2-column grid, so the trigger —
        // and the default trigger-width popover — is too narrow and long
        // "code - name" labels wrapped and overlapped (fixed-height virtual rows).
        // Widen the panel and force single-line rows with ellipsis instead.
        popoverWidth="w-[min(92vw,32rem)]"
        popoverAlign="start"
        renderItem={(o) => (
          <span className="min-w-0 flex-1 truncate text-left">{o.label}</span>
        )}
        size="sm"
        className="w-full"
        modal
      />
    </>
  );
}

function LookupControl({ node, id }: LookupControlProps) {
  const tc = useTranslations("common");
  const options: LookupOption[] = node.items
    .map((item, idx) => ({
      value: node.values[idx] || item,
      label: item === "ALL" ? tc("all") : item,
    }))
    .filter((o) => o.value !== "");

  // Data-source-backed lookups (product/location/vendor/category/...) can be
  // long → searchable combobox. Hard-coded enum lookups (Status/GroupBy/Day)
  // have few options and stay a plain select.
  if (node.dataSource && options.length > 0) {
    return <SearchableLookupControl options={options} id={id} />;
  }

  if (options.length > 0) {
    return (
      <FieldSelect
        name={id}
        defaultValue={options[0].value}
        className="h-8"
      >
        <SelectContent className="max-h-[min(60vh,400px)]" position="popper">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </FieldSelect>
    );
  }

  return (
    <FieldSelect
      name={id}
      placeholder={`(${node.dataSource})`}
      className="h-8"
    >
      <SelectContent className="max-h-[min(60vh,400px)]" position="popper" />
    </FieldSelect>
  );
}

function MultiLookupControl({
  node,
  id,
}: {
  readonly node: LookupNode;
  readonly id: string;
}) {
  const tc = useTranslations("common");
  const options = node.items
    .map((item, idx) => ({ item, value: node.values[idx] || item }))
    .filter((o) => o.value !== "");
  // empty selection = no filter (all). Submitted as a comma-joined string;
  // micro-data splits it into an IN (...) predicate.
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (value: string, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value),
    );
  return (
    <>
      <input type="hidden" name={id} value={selected.join(",")} readOnly />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-md border p-2">
        {options.map(({ item, value }) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-1.5 text-sm"
          >
            <Checkbox
              checked={selected.includes(value)}
              onCheckedChange={(c) => toggle(value, c === true)}
            />
            {item === "ALL" ? tc("all") : item}
          </label>
        ))}
      </div>
    </>
  );
}

interface DateControlProps {
  readonly node: DateNode;
  readonly periods?: ReportPeriodMap;
}

function DateControl({ node, periods }: DateControlProps) {
  const initial = resolveDateKeyword(node.value, periods);
  // key={initial}: periods มาจาก query async — render แรก periods ว่าง ทำให้ field
  // ที่ใช้ @current_period/@previous_period ได้ initial = "" เมื่อ periods โหลดเสร็จ
  // initial เปลี่ยน → remount ด้วยค่าใหม่ (เกิดครั้งเดียวก่อนผู้ใช้แก้ เพราะ periods
  // นิ่งหลังโหลด) ไม่งั้น useState(initial) จะค้างค่าว่างตลอด
  return (
    <DateControlInner key={initial} name={node.name} initial={initial} />
  );
}

function DateControlInner({
  name,
  initial,
}: {
  readonly name: string;
  readonly initial: string;
}) {
  // state drives both <FieldDatePicker> และ hidden input ที่ FormData อ่าน
  // remount ผ่าน key={initial} ที่ parent ทำให้ค่าเริ่มต้นตรงกับ periods ที่โหลดเสร็จ
  const [value, setValue] = useState(initial);
  return (
    <>
      <input type="hidden" name={name} value={value} readOnly />
      <FieldDatePicker
        value={value}
        onValueChange={setValue}
        size="sm"
        className="w-full"
      />
    </>
  );
}

interface ControlProps {
  readonly node: LookupNode | DateNode;
  readonly periods?: ReportPeriodMap;
}

function Control({ node, periods }: ControlProps) {
  if (node.type === "lookup") {
    return node.multi ? (
      <MultiLookupControl node={node} id={node.name} />
    ) : (
      <LookupControl node={node} id={node.name} />
    );
  }
  return <DateControl node={node} periods={periods} />;
}

interface FieldControlProps {
  readonly field: FormField;
  readonly periods?: ReportPeriodMap;
}

function FieldControl({ field, periods }: FieldControlProps) {
  const tc = useTranslations("common");

  if (field.kind === "range") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-muted-foreground text-[0.625rem]">
            {tc("from")}
          </span>
          <Control node={field.from} periods={periods} />
        </div>
        <div>
          <span className="text-muted-foreground text-[0.625rem]">
            {tc("to")}
          </span>
          <Control node={field.to} periods={periods} />
        </div>
      </div>
    );
  }
  return <Control node={field.control} periods={periods} />;
}

/**
 * รวบรวมรายการ DataSource ที่ไม่ซ้ำจาก FormField ทั้งหมด
 */
function collectDataSources(fields: FormField[]): string[] {
  const sources = new Set<string>();
  for (const field of fields) {
    const ctrls =
      field.kind === "range" ? [field.from, field.to] : [field.control];
    for (const ctrl of ctrls) {
      if (ctrl.type === "lookup" && ctrl.dataSource) {
        sources.add(ctrl.dataSource);
      }
    }
  }
  return [...sources];
}

/**
 * คืนค่า true ถ้ามี date field ที่ใช้ period keyword
 */
function needsPeriods(fields: FormField[]): boolean {
  for (const field of fields) {
    const ctrls =
      field.kind === "range" ? [field.from, field.to] : [field.control];
    for (const ctrl of ctrls) {
      if (
        ctrl.type === "date" &&
        (ctrl.value === "@current_period" || ctrl.value === "@previous_period")
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Dialog รับพารามิเตอร์การเรียกใช้งานรายงาน build ฟิลด์จาก XML dialog ของ
 * report template ดึง lookup + period ผ่าน `useReportListLookups`
 *
 * Form-state ใช้ native `<form>` + `FormData` (เก็บค่าได้ง่ายแบบ XML-driven
 * dynamic) ไม่ใช้ RHF เพราะ field list มาแบบ runtime จาก XML
 *
 * @param props - open, onOpenChange, report, onRun
 * @returns React element
 */
export function ReportParamDialog({
  open,
  onOpenChange,
  report,
  onRun,
}: ReportParamDialogProps) {
  const tc = useTranslations("common");
  const t = useTranslations("report");
  const formRef = useRef<HTMLFormElement>(null);

  const dialogXml = report?.Dialog;
  const fields: FormField[] =
    !dialogXml || dialogXml.trim().length === 0 ? [] : parseReportDialog(dialogXml);

  const sources = collectDataSources(fields);
  const includePeriods = needsPeriods(fields);

  const { data: lookupResult } = useReportListLookups({
    sources,
    includePeriods,
  });
  const lookupData = lookupResult?.data ?? {};
  const periods = lookupResult?.periods ?? {};

  // Inject lookup data into fields
  const enrichedFields = fields.map((field) => {
    const injectLookup = (
      ctrl: LookupNode | DateNode,
    ): LookupNode | DateNode => {
      if (ctrl.type !== "lookup") return ctrl;
      const ds = ctrl.dataSource;
      if (!ds) return ctrl;
      const items = lookupData[ds];
      if (!items || items.length === 0) return ctrl;
      return {
        ...ctrl,
        items: ["ALL", ...items.map((i) => i.name)],
        values: ["ALL", ...items.map((i) => i.code)],
      };
    };
    if (field.kind === "range") {
      return {
        ...field,
        from: injectLookup(field.from),
        to: injectLookup(field.to),
      };
    }
    return { ...field, control: injectLookup(field.control) };
  });

  const handleSubmit = () => {
    if (!report || !onRun) return;

    const filters: Record<string, string> = {};
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      for (const [key, value] of formData.entries()) {
        filters[key] = value.toString();
      }
    }

    onRun(report, filters);
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-3 p-4">
        <DialogHeader className="shrink-0 gap-0 pb-1">
          <DialogTitle className="text-sm">{report.ReportName}</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          className="min-h-0 flex-1 overflow-y-auto pr-1"
        >
          {enrichedFields.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {t("noFiltersConfigured")}
            </p>
          ) : (
            <FieldGroup className="gap-3">
              {enrichedFields.map((field) => {
                const key =
                  field.kind === "range"
                    ? `${field.from.name}-${field.to.name}`
                    : field.control.name;
                const label =
                  field.kind === "range"
                    ? field.label.replace(/ From$/, "")
                    : field.label;
                return (
                  <Field key={key}>
                    <FieldLabel className="text-xs">{label}</FieldLabel>
                    <FieldControl field={field} periods={periods} />
                  </Field>
                );
              })}
            </FieldGroup>
          )}
        </form>

        <DialogFooter className="shrink-0 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit}>
            {t("runReport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
