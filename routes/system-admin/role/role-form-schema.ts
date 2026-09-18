import { z } from "zod";
import type { RoleDetail } from "@/types/role";

export const roleSchema = z.object({
  application_role_name: z.string().min(1, "Name is required"),
  permissions: z.array(z.string()),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

export const EMPTY_FORM: RoleFormValues = {
  application_role_name: "",
  permissions: [],
};

export function getDefaultValues(role?: RoleDetail): RoleFormValues {
  if (!role) return EMPTY_FORM;
  return {
    application_role_name: role.application_role_name,
    permissions: role.permissions.map((p) => p.permission_id),
  };
}
