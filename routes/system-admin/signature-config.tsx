
import { useEffect, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import {
  useAppConfigByKey,
  useUpsertAppConfig,
  useSignatureCandidates,
  type SignatureCandidate,
} from "@/hooks/use-app-config";
import { useWorkflowTypeQuery, useWorkflowById } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { LookupCombobox } from "@/components/lookup/lookup-combobox";

export interface SignatureEntry {
  position: number;
  user_id?: string;
  name: string;
  label: string;
}

/** Derive backend doc_type slug (pr/po/sr/grn/cn/adjustment) from the
 *  signature config key which always follows `<doc>_signature_config`. */
function docTypeFromSignatureKey(key: string): string | undefined {
  const SUFFIX = "_signature_config";
  if (!key.endsWith(SUFFIX)) return undefined;
  const prefix = key.slice(0, -SUFFIX.length);
  const VALID = new Set(["pr", "po", "sr", "grn", "cn", "adjustment"]);
  return VALID.has(prefix) ? prefix : undefined;
}

function candidateFullName(c: SignatureCandidate): string {
  return [c.firstname, c.middlename, c.lastname].filter(Boolean).join(" ").trim();
}

export interface SignatureConfigProps {
  /** e.g. "Purchase Request Config" */
  title: string;
  /** Short description under the title */
  description: string;
  /** Backend config key for print settings, e.g. "pr_print_config" */
  printConfigKey: string;
  /** Backend config key for signature settings, e.g. "pr_signature_config" */
  signatureConfigKey: string;
  /** Default signatures when no config exists */
  defaultSignatures: SignatureEntry[];
  /** Success toast label, e.g. "PR" */
  docLabel: string;
  /**
   * Optional workflow type. When provided, shows a workflow picker so admin
   * can import signatures from a workflow's stages.
   */
  workflowType?: WORKFLOW_TYPE;
}

const signatureSchema = z.object({
  // Position is renumbered server-side in onSubmit (i+1). Keep it permissive
  // so stale NaN/undefined/string values from form state don't block save.
  position: z.coerce.number().int().min(1).catch(1),
  user_id: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) =>
        v === undefined ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      { message: "Invalid user id" },
    ),
  name: z.string(),
  label: z.string().min(1, "Label is required"),
});

const schema = z.object({
  orientation: z.enum(["portrait", "landscape"]),
  signatures: z
    .array(signatureSchema)
    .min(1, "At least 1 signature is required")
    .max(5, "Maximum 5 signatures"),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(
  printValue: Record<string, unknown> | undefined,
  sigValue: Record<string, unknown> | undefined,
  defaults: SignatureEntry[],
): FormValues {
  const orientation =
    (printValue?.orientation as string) === "landscape"
      ? "landscape"
      : "portrait";
  // Backend returns `{ signatures: [] }` as the default row; fall through to
  // the caller-provided defaults in that case so the form isn't empty.
  const rawSigs = sigValue?.signatures as Array<Record<string, unknown>> | undefined;
  const sigs = rawSigs && rawSigs.length > 0 ? rawSigs : defaults;
  return {
    orientation: orientation as "portrait" | "landscape",
    signatures: sigs.map((s, i) => {
      const rawPos = Number(s.position);
      return {
        position: Number.isFinite(rawPos) && rawPos > 0 ? rawPos : i + 1,
        user_id: (s.user_id as string) || "",
        name: (s.name as string) || "",
        label: (s.label as string) || "",
      };
    }),
  };
}

// ── Sortable signature card ──

interface SortableSignatureCardProps {
  id: string;
  index: number;
  form: ReturnType<typeof useForm<FormValues>>;
  error?: string;
  onRemove: () => void;
  disableRemove: boolean;
  candidates: SignatureCandidate[];
  candidatesLoading: boolean;
  hasWorkflow: boolean;
}

function SortableSignatureCard({
  id,
  index,
  form,
  error,
  onRemove,
  disableRemove,
  candidates,
  candidatesLoading,
  hasWorkflow,
}: SortableSignatureCardProps) {
  const { register } = form;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex flex-col gap-2 rounded-lg border bg-muted/30 p-4"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="text-xs text-muted-foreground font-semibold">
          #{index + 1}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onRemove}
          disabled={disableRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1 py-2">
        <div className="mb-1 h-px w-24 border-b border-dashed border-foreground/40" />
        <p className="text-[10px] text-muted-foreground">Signature</p>
      </div>

      <Field>
        <FieldLabel className="text-xs">Label</FieldLabel>
        <Input
          {...register(`signatures.${index}.label`)}
          placeholder="e.g. Approved by"
          className="text-sm"
        />
        <FieldError>{error}</FieldError>
      </Field>
      <Field>
        <FieldLabel className="text-xs">Name</FieldLabel>
        {hasWorkflow ? (
          <LookupCombobox<SignatureCandidate>
            value={form.watch(`signatures.${index}.user_id`) || ""}
            onValueChange={(id, item) => {
              form.setValue(`signatures.${index}.user_id`, id, {
                shouldDirty: true,
              });
              form.setValue(
                `signatures.${index}.name`,
                item ? candidateFullName(item) : "",
                { shouldDirty: true },
              );
            }}
            items={candidates}
            getId={(c) => c.user_id}
            getLabel={(c) => candidateFullName(c) || c.email}
            getSearchValue={(c) => `${candidateFullName(c)} ${c.email}`}
            isLoading={candidatesLoading}
            placeholder={
              candidates.length === 0 && !candidatesLoading
                ? "No eligible approver"
                : "Select signer…"
            }
            searchPlaceholder="Search by name or email"
            disabled={candidates.length === 0 && !candidatesLoading}
            size="sm"
          />
        ) : (
          <Input
            {...register(`signatures.${index}.name`)}
            placeholder="(optional)"
            className="text-sm"
          />
        )}
      </Field>
    </div>
  );
}

// ── Main component ──

export default function SignatureConfig({
  title,
  description,
  printConfigKey,
  signatureConfigKey,
  defaultSignatures,
  docLabel,
  workflowType,
}: SignatureConfigProps) {
  const { data: printData, isLoading: loadingPrint } =
    useAppConfigByKey(printConfigKey);
  const { data: sigData, isLoading: loadingSig } =
    useAppConfigByKey(signatureConfigKey);
  const upsert = useUpsertAppConfig();

  const docType = docTypeFromSignatureKey(signatureConfigKey);
  const { data: signatureCandidates = [], isLoading: loadingCandidates } =
    useSignatureCandidates(docType);

  // Workflow integration (optional)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const { data: workflowList } = useWorkflowTypeQuery(workflowType);
  const { data: selectedWorkflow } = useWorkflowById(
    selectedWorkflowId || undefined,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      orientation: "portrait",
      signatures: defaultSignatures,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "signatures",
  });

  useEffect(() => {
    if (!loadingPrint && !loadingSig) {
      form.reset(
        toFormValues(printData?.value, sigData?.value, defaultSignatures),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printData, sigData, loadingPrint, loadingSig]);

  // ── DnD ──

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    move(oldIndex, newIndex);
  };

  const activeDragIndex = activeDragId
    ? fields.findIndex((f) => f.id === activeDragId)
    : -1;

  // ── Submit ──

  const onSubmit = async (values: FormValues) => {
    const signatures = values.signatures.map((s, i) => {
      const { user_id, ...rest } = s;
      return {
        ...rest,
        position: i + 1,
        ...(user_id ? { user_id } : {}),
      };
    });
    try {
      await Promise.all([
        new Promise<void>((resolve, reject) =>
          upsert.mutate(
            {
              key: printConfigKey,
              value: { orientation: values.orientation },
            },
            { onSuccess: () => resolve(), onError: reject },
          ),
        ),
        new Promise<void>((resolve, reject) =>
          upsert.mutate(
            { key: signatureConfigKey, value: { signatures } },
            { onSuccess: () => resolve(), onError: reject },
          ),
        ),
      ]);
      toast.success(`${docLabel} config saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  if (loadingPrint || loadingSig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div>
        <div className="flex items-center gap-2">
          <ModuleTileIcon />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          scrollToFirstInvalidField();
          // Walk the error tree and collect human-readable "path: message" pairs.
          const msgs: string[] = [];
          const walk = (node: unknown, path: string) => {
            if (!node || typeof node !== "object") return;
            const n = node as Record<string, unknown>;
            if (typeof n.message === "string") {
              msgs.push(`${path || "form"}: ${n.message}`);
              return;
            }
            for (const [k, v] of Object.entries(n)) {
              walk(v, path ? `${path}.${k}` : k);
            }
          };
          walk(errors, "");
          console.error("[signature-config] validation errors:", errors);
          toast.error(msgs[0] || "Form has validation errors");
        })}
        className="mt-6 space-y-6"
      >
        <div className="max-w-2xl rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Print Settings</h2>
          <Field>
            <FieldLabel>Orientation</FieldLabel>
            <Select
              value={form.watch("orientation")}
              onValueChange={(v) =>
                form.setValue("orientation", v as "portrait" | "landscape")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {workflowType && (
          <div className="max-w-2xl rounded-lg border p-4">
            <h2 className="mb-2 font-semibold">Import from Workflow</h2>
            <p className="text-muted-foreground mb-4 text-xs">
              Select a workflow to pull its stages as signature entries. Stage
              name becomes the signature label; assigned user (if any) becomes
              the name.
            </p>
            {Array.isArray(workflowList) && workflowList.length > 0 ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field className="flex-1">
                    <FieldLabel>Workflow</FieldLabel>
                    <Select
                      value={selectedWorkflowId}
                      onValueChange={setSelectedWorkflowId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— Select workflow —" />
                      </SelectTrigger>
                      <SelectContent>
                        {workflowList.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !selectedWorkflow?.data?.stages?.length ||
                      form.formState.isSubmitting
                    }
                    onClick={() => {
                      const stages = selectedWorkflow?.data?.stages ?? [];
                      const approvalStages = stages
                        .filter(
                          (s) => (s.role as string) !== "view_only",
                        )
                        .slice(0, 5);
                      form.setValue(
                        "signatures",
                        approvalStages.map((s, i) => {
                          const firstUser = s.assigned_users?.[0];
                          const fullName = firstUser
                            ? [
                                firstUser.firstname,
                                firstUser.middlename,
                                firstUser.lastname,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "";
                          return {
                            position: i + 1,
                            user_id: firstUser?.user_id ?? "",
                            label: s.name,
                            name: fullName,
                          };
                        }),
                      );
                    }}
                  >
                    Import Stages
                  </Button>
                </div>
                {selectedWorkflow?.data?.stages?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedWorkflow.data.stages.map((s) => (
                      <button
                        type="button"
                        key={s.name}
                        disabled={fields.length >= 5}
                        className="rounded-md border bg-muted/30 px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                        onClick={() => {
                          const firstUser = s.assigned_users?.[0];
                          const fullName = firstUser
                            ? [
                                firstUser.firstname,
                                firstUser.middlename,
                                firstUser.lastname,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "";
                          append({
                            position: fields.length + 1,
                            user_id: firstUser?.user_id ?? "",
                            label: s.name,
                            name: fullName,
                          });
                        }}
                      >
                        <Plus className="mr-1 inline size-3" />
                        {s.name}
                        {s.role ? (
                          <span className="ml-1 text-muted-foreground">
                            · {s.role}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground text-xs rounded-md border border-dashed p-3">
                No workflows found for this document type. Create a workflow in{" "}
                <span className="font-semibold text-foreground">
                  System Admin &gt; Workflow
                </span>{" "}
                first, or add signatures manually below.
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Signatures</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={fields.length >= 5}
              onClick={() =>
                append({
                  position: fields.length + 1,
                  user_id: "",
                  name: "",
                  label: "",
                })
              }
            >
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>
          <p className="text-muted-foreground mb-4 text-xs">
            Drag to reorder. Signatures will appear on the printed report in
            this order (max 5).
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveDragId(e.active.id as string)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {fields.map((field, index) => (
                  <SortableSignatureCard
                    key={field.id}
                    id={field.id}
                    index={index}
                    form={form}
                    error={
                      form.formState.errors.signatures?.[index]?.label?.message
                    }
                    onRemove={() => remove(index)}
                    disableRemove={fields.length <= 1}
                    candidates={signatureCandidates}
                    candidatesLoading={loadingCandidates}
                    hasWorkflow={!!docType}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragIndex >= 0 ? (
                <div className="flex flex-col items-center gap-1 rounded-lg border bg-background p-4 shadow-lg">
                  <GripVertical className="size-4 text-muted-foreground" />
                  <div className="mb-1 h-px w-24 border-b border-dashed border-foreground/40" />
                  <span className="text-sm font-semibold">
                    {form.getValues(`signatures.${activeDragIndex}.label`) ||
                      `Signature ${activeDragIndex + 1}`}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Report preview */}
          <div className="mt-6 rounded-lg border border-dashed p-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              Report Preview
            </p>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr))`,
              }}
            >
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col items-center gap-1 text-center"
                >
                  <div className="h-10" />
                  <div className="h-px w-full border-b border-foreground/30" />
                  <p className="text-xs font-semibold">
                    {form.watch(`signatures.${index}.label`) || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {form.watch(`signatures.${index}.name`) || "\u00A0"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={upsert.isPending}>
          <Save className="mr-1 size-4" />
          {upsert.isPending ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  );
}
