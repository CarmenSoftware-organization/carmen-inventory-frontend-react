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
import { formatName } from "@/lib/name";
import { cn } from "@/lib/utils";
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
    let result = users;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      result = users.filter(
        (u) =>
          u.firstname.toLowerCase().includes(q) ||
          u.lastname.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.middlename && u.middlename.toLowerCase().includes(q)),
      );
    }

    // Sort assigned users to the top, then alphabetically by firstname
    return [...result].sort((a, b) => {
      const aAssigned = assignedUserIds.has(a.user_id) ? 1 : 0;
      const bAssigned = assignedUserIds.has(b.user_id) ? 1 : 0;

      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned;
      }

      return a.firstname.localeCompare(b.firstname);
    });
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
        <div className="border-warning/30 bg-warning/5 text-warning-ink flex items-center gap-2.5 rounded-lg border p-3 text-sm">
          <Lock className="size-4 shrink-0" />
          <p>{t("hodEnabled")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                placeholder={t("searchUsers")}
                size="sm"
                className="w-full pl-8"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            {!isDisabled && (
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => assignAll(userSearch ? filteredUsers : users)}
                  className="hover:bg-secondary/80"
                >
                  {userSearch ? t("assignFiltered") : t("assignAll")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    unassignAll(userSearch ? filteredUsers : users)
                  }
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                >
                  {userSearch ? t("unassignFiltered") : t("unassignAll")}
                </Button>
              </div>
            )}
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <Search className="text-muted-foreground/40 mb-2 size-6" />
                <p className="text-muted-foreground text-xs">
                  {t("noUsersFound")}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isAssigned = assignedUserIds.has(user.user_id);
                return (
                  <div
                    key={user.user_id}
                    className={cn(
                      "group flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
                      isAssigned
                        ? "border-primary bg-primary/5"
                        : "hover:border-border hover:bg-muted/40 border-transparent",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="bg-muted text-foreground text-micro font-medium">
                          {formatName(user.firstname, user.lastname)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <p className="text-foreground truncate text-xs leading-tight font-medium">
                          {user.firstname} {user.lastname}
                        </p>
                        <p className="text-muted-foreground text-micro-legal truncate leading-tight">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {!isDisabled && (
                      <Button
                        type="button"
                        variant={isAssigned ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => toggleUser(user)}
                        className={cn(
                          isAssigned
                            ? "border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            : "hover:bg-primary hover:text-primary-foreground",
                        )}
                      >
                        {isAssigned ? t("unassign") : t("assign")}
                      </Button>
                    )}
                    {isDisabled && isAssigned && (
                      <Badge variant="primary-light" size="xs">
                        {t("assigned")}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
