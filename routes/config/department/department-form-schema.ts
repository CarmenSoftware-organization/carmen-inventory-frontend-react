import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { transferPayloadSchema } from "@/lib/transfer-handler";
import type { Department } from "@/types/department";

export function createDepartmentSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    account_code: z.string(),
    is_active: z.boolean(),
    department_users: transferPayloadSchema,
    hod_users: transferPayloadSchema,
  });
}

export type DepartmentFormValues = z.infer<
  ReturnType<typeof createDepartmentSchema>
>;

const emptyTransfer = { add: [], remove: [] };

export const EMPTY_FORM: DepartmentFormValues = {
  code: "",
  name: "",
  description: "",
  account_code: "",
  is_active: true,
  department_users: { ...emptyTransfer },
  hod_users: { ...emptyTransfer },
};

export function getDefaultValues(
  department?: Department,
): DepartmentFormValues {
  if (!department) return { ...EMPTY_FORM };
  return {
    code: department.code,
    name: department.name,
    description: department.description,
    account_code: department.account_code ?? "",
    is_active: department.is_active,
    department_users: { ...emptyTransfer },
    hod_users: { ...emptyTransfer },
  };
}
