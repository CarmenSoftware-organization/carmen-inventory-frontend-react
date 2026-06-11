
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

interface DepartmentCheckboxListProps {
  readonly departments: { id: string; name: string }[];
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  readonly isDisabled: boolean;
}

export function DepartmentCheckboxList({
  departments,
  value,
  onChange,
  isDisabled,
}: DepartmentCheckboxListProps) {
  const t = useTranslations("systemAdmin.workflow");
  const valueSet = new Set(value);

  const toggle = (deptName: string) => {
    if (valueSet.has(deptName)) {
      onChange(value.filter((v) => v !== deptName));
    } else {
      onChange([...value, deptName]);
    }
  };

  return (
    <Field>
      <FieldLabel>{t("departments")}</FieldLabel>
      <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-1.5">
        {departments.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noDepartments")}</p>
        ) : (
          departments.map((dept) => (
            <div key={dept.id} className="flex items-center gap-1.5">
              <Checkbox
                checked={valueSet.has(dept.name)}
                onCheckedChange={() => toggle(dept.name)}
                disabled={isDisabled}
              />
              <span className="text-xs">{dept.name}</span>
            </div>
          ))
        )}
      </div>
    </Field>
  );
}
