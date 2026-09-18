import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { UserProfile } from "@/types/profile";

export function createProfileSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    alias_name: z.string().max(2, tv("aliasMaxLength", { max: 2 })),
    firstname: z.string().min(1, tv("required", { field: tf("firstName") })),
    middlename: z.string(),
    lastname: z.string().min(1, tv("required", { field: tf("lastName") })),
    telephone: z.string(),
  });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

export const EMPTY_FORM: ProfileFormValues = {
  alias_name: "",
  firstname: "",
  middlename: "",
  lastname: "",
  telephone: "",
};

export function getDefaultValues(profile?: UserProfile): ProfileFormValues {
  if (!profile) return EMPTY_FORM;
  return {
    alias_name: profile.alias_name ?? "",
    firstname: profile.user_info.firstname ?? "",
    middlename: profile.user_info.middlename ?? "",
    lastname: profile.user_info.lastname ?? "",
    telephone: profile.user_info.telephone ?? "",
  };
}
