
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
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <Lock className="size-4 text-amber-600" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("hodEnabled")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder={t("searchUsers")}
                className="h-9 w-full rounded-lg bg-muted/30 pl-9 transition-colors hover:bg-muted/50 focus:bg-background"
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
                  className="h-9 px-4 text-sm font-medium shadow-sm transition-all hover:bg-secondary/80"
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
                  className="h-9 px-4 text-sm font-medium shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                >
                  {userSearch ? t("unassignFiltered") : t("unassignAll")}
                </Button>
              </div>
            )}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <Search className="mb-2 size-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
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
                      "group flex items-center justify-between rounded-xl border p-4 transition-all duration-200",
                      isAssigned
                        ? "border-primary/20 bg-primary/5 shadow-sm ring-1 ring-primary/10"
                        : "border-transparent hover:border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className={cn(
                        "size-8 shadow-sm transition-transform duration-200",
                        isAssigned ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "group-hover:scale-105"
                      )}>
                        <AvatarFallback className="bg-muted text-sm font-medium text-foreground">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className={cn(
                          "text-sm font-semibold leading-tight transition-colors",
                          isAssigned ? "text-primary" : "text-foreground"
                        )}>
                          {user.firstname} {user.lastname}
                        </p>
                        <p className="text-sm text-muted-foreground/80 leading-tight mt-0.5">
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
                          "h-9 px-4 text-sm font-medium shadow-sm transition-all",
                          isAssigned 
                            ? "border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                            : "hover:bg-primary hover:text-primary-foreground"
                        )}
                      >
                        {isAssigned ? t("unassign") : t("assign")}
                      </Button>
                    )}
                    {isDisabled && isAssigned && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20"
                      >
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
