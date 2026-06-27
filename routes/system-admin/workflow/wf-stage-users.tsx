
import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field, FieldLabel } from "@/components/ui/field";
import type { User } from "@/types/workflows";
import type { WorkflowCreateModel } from "./wf-form-schema";

interface WfStageUsersProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly index: number;
  readonly users: User[];
  readonly isMiddle: boolean;
  readonly isDisabled: boolean;
  readonly isHod: boolean;
  readonly assignedUserIds: Set<string>;
}

export function WfStageUsers({
  form,
  index,
  users,
  isMiddle,
  isDisabled,
  isHod,
  assignedUserIds,
}: WfStageUsersProps) {
  const [userSearch, setUserSearch] = useState("");
  const t = useTranslations("systemAdmin.workflow");

  const filteredUsers = (() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.firstname.toLowerCase().includes(q) ||
        u.lastname.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.middlename && u.middlename.toLowerCase().includes(q)),
    );
  })();

  const toggleUser = (user: User) => {
    if (isDisabled) return;
    const current = form.getValues(`data.stages.${index}.assigned_users`) ?? [];
    if (assignedUserIds.has(user.user_id)) {
      form.setValue(
        `data.stages.${index}.assigned_users`,
        current.filter((u) => u.user_id !== user.user_id),
      );
    } else {
      form.setValue(`data.stages.${index}.assigned_users`, [...current, user]);
    }
  };

  const assignAll = (userList: User[]) => {
    if (isDisabled) return;
    const current = form.getValues(`data.stages.${index}.assigned_users`) ?? [];
    const currentIds = new Set(current.map((u) => u.user_id));
    const toAdd = userList.filter((u) => !currentIds.has(u.user_id));
    form.setValue(`data.stages.${index}.assigned_users`, [
      ...current,
      ...toAdd,
    ]);
  };

  const unassignAll = (userList: User[]) => {
    if (isDisabled) return;
    const removeIds = new Set(userList.map((u) => u.user_id));
    const current = form.getValues(`data.stages.${index}.assigned_users`) ?? [];
    form.setValue(
      `data.stages.${index}.assigned_users`,
      current.filter((u) => !removeIds.has(u.user_id)),
    );
  };

  return (
    <>
      {isMiddle && (
        <Field orientation="horizontal">
          <Controller
            control={form.control}
            name={`data.stages.${index}.is_hod`}
            render={({ field }) => (
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    form.setValue(`data.stages.${index}.assigned_users`, []);
                  }
                }}
                disabled={isDisabled}
              />
            )}
          />
          <FieldLabel>{t("isHod")}</FieldLabel>
        </Field>
      )}

      {isHod ? (
        <div className="border-warning/40 bg-warning/10 flex items-center gap-1.5 rounded border px-2 py-1.5">
          <Lock className="text-warning-foreground size-3" />
          <p className="text-warning-foreground text-xs">{t("hodEnabled")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3 -translate-y-1/2" />
              <Input
                placeholder={t("searchUsers")}
                className="h-7 pl-7 text-xs"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            {!isDisabled && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => assignAll(userSearch ? filteredUsers : users)}
                  className="h-6 px-1.5 text-xs"
                >
                  {userSearch ? t("assignFiltered") : t("assignAll")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    unassignAll(userSearch ? filteredUsers : users)
                  }
                  className="h-6 px-1.5 text-xs"
                >
                  {userSearch ? t("unassignFiltered") : t("unassignAll")}
                </Button>
              </div>
            )}
          </div>

          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-muted-foreground py-3 text-center text-xs">
                {t("noUsersFound")}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isAssigned = assignedUserIds.has(user.user_id);
                return (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between rounded border px-1.5 py-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[0.5625rem]">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs leading-tight font-semibold">
                          {user.firstname} {user.lastname}
                        </p>
                        <p className="text-muted-foreground text-[0.625rem] leading-tight">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {!isDisabled && (
                      <Button
                        type="button"
                        variant={isAssigned ? "destructive" : "outline"}
                        size="xs"
                        onClick={() => toggleUser(user)}
                        className="h-6 px-1.5 text-xs"
                      >
                        {isAssigned ? t("unassign") : t("assign")}
                      </Button>
                    )}
                    {isDisabled && isAssigned && (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0 text-[0.5625rem]"
                      >
                        {t("assigned")}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </>
  );
}
