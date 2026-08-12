import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Ban,
  Boxes,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Copy,
  FilePlus2,
  History,
  LayoutTemplate,
  ListTree,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Send,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { FormMode } from "@/types/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel, FieldPlainText } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupCombobox } from "@/components/lookup/lookup-combobox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkflowTrack } from "@/components/share/workflow-track";
import {
  accountingDocumentFromPath,
  accountingDetailInitialMode,
  documentsFor,
} from "./accounting-documents";

const DEPARTMENTS = [
  { id: "100", label: "100 - Admin" },
  { id: "200", label: "200 - Rooms" },
  { id: "300", label: "300 - Food & Beverage" },
  { id: "400", label: "400 - Engineering" },
];

const ACCOUNTS = [
  { id: "51001", label: "51001 - Electricity Expense" },
  { id: "21100", label: "21100 - Accounts Payable" },
  { id: "61010", label: "61010 - Operating Supplies" },
  { id: "41000", label: "41000 - Room Revenue" },
];

const TAX_CODES = [
  { id: "VAT7", label: "VAT 7%" },
  { id: "NOVAT", label: "Non-VAT" },
];

const WHT_CODES = [
  { id: "NONE", label: "No WHT" },
  { id: "WHT3", label: "WHT 3%" },
  { id: "WHT5", label: "WHT 5%" },
];

const BUDGETS = [
  { id: "OPEX-ADMIN", label: "OPEX-ADMIN - Administration" },
  { id: "OPEX-ROOMS", label: "OPEX-ROOMS - Rooms" },
  { id: "CAPEX-2026", label: "CAPEX-2026 - Capital expenditure" },
];

const DIMENSIONS = [
  { id: "ADM", label: "ADM - Administration" },
  { id: "ROOM", label: "ROOM - Rooms Division" },
  { id: "FNB", label: "FNB - Food & Beverage" },
  { id: "ENG", label: "ENG - Engineering" },
];

interface JournalLine {
  id: string;
  department: string;
  account: string;
  comment: string;
  debit: number;
  credit: number;
  taxCode: string;
  whtCode: string;
  budgetControlled: boolean;
  budget: string;
  dimension: string;
}

type LineDetailSection = "tax" | "budget" | "dimension";
type UtilityPanel = "attachments" | "log";

const FORM_ID = "accounting-document-form";

const INITIAL_LINES: JournalLine[] = [
  {
    id: "line-1",
    department: "100",
    account: "51001",
    comment: "Office building electricity",
    debit: 10000,
    credit: 0,
    taxCode: "VAT7",
    whtCode: "NONE",
    budgetControlled: true,
    budget: "OPEX-ADMIN",
    dimension: "ADM",
  },
  {
    id: "line-2",
    department: "100",
    account: "21100",
    comment: "Utilities payable accrual",
    debit: 0,
    credit: 10000,
    taxCode: "NOVAT",
    whtCode: "WHT3",
    budgetControlled: true,
    budget: "OPEX-ADMIN",
    dimension: "ADM",
  },
];

const optionLabel = (
  options: ReadonlyArray<{ id: string; label: string }>,
  value: string,
) => options.find((option) => option.id === value)?.label ?? value;

export default function AccountingDetail() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("accounting.documents");
  const tc = useTranslations("common");
  const config = accountingDocumentFromPath(pathname);
  const hasWorkflowApproval =
    config.kind === "journalVoucher" ||
    config.kind === "apInvoice" ||
    config.kind === "apPayment" ||
    config.kind === "arInvoice" ||
    config.kind === "arReceipt";
  const hasInlineApproval =
    config.kind === "recurringVoucher" || config.kind === "allocationVoucher";
  const documents = useMemo(() => documentsFor(config), [config]);
  const document = documents.find((item) => item.id === id) ?? documents[0];
  const isNew = id === "new";
  const number = isNew ? t("autoNumber") : document.number;
  const [mode, setMode] = useState<FormMode>(() =>
    accountingDetailInitialMode(id),
  );
  const isView = mode === "view";
  const editActivatedAtRef = useRef(0);
  const [documentStatus, setDocumentStatus] = useState<string>(
    isNew ? "Draft" : document.status,
  );
  const [utilityPanel, setUtilityPanel] = useState<UtilityPanel | null>(null);
  const [values, setValues] = useState({
    date: document.date,
    description: isNew ? "" : document.description,
    party: isNew ? "" : document.party,
    schedulePost: true,
    scheduleDate: document.date,
    autoReverse: true,
    reverseDate: "2026-08-01",
  });
  const [lines, setLines] = useState<JournalLine[]>(INITIAL_LINES);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [lineDetailSection, setLineDetailSection] =
    useState<LineDetailSection>("tax");
  const selectedLine = lines.find((line) => line.id === selectedLineId);
  const allLinesSelected =
    lines.length > 0 && selectedLineIds.length === lines.length;
  const someLinesSelected = selectedLineIds.length > 0 && !allLinesSelected;

  const resetForm = () => {
    setValues({
      date: document.date,
      description: isNew ? "" : document.description,
      party: isNew ? "" : document.party,
      schedulePost: true,
      scheduleDate: document.date,
      autoReverse: true,
      reverseDate: "2026-08-01",
    });
    setLines(INITIAL_LINES);
    setSelectedLineIds([]);
  };

  const addLine = useCallback(() => {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        department: "",
        account: "",
        comment: "",
        debit: 0,
        credit: 0,
        taxCode: "",
        whtCode: "NONE",
        budgetControlled: false,
        budget: "",
        dimension: "",
      },
    ]);
  }, []);

  useEffect(() => {
    if (isView) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.key.toLowerCase() !== "a") return;
      event.preventDefault();
      addLine();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addLine, isView]);

  const updateLine = (lineId: string, patch: Partial<JournalLine>) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line,
      ),
    );
  };

  const moveLine = (lineId: string, offset: -1 | 1) => {
    setLines((current) => {
      const index = current.findIndex((line) => line.id === lineId);
      const targetIndex = index + offset;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];
      return reordered;
    });
  };

  const openLineDetail = (lineId: string, section: LineDetailSection) => {
    setSelectedLineId(lineId);
    setLineDetailSection(section);
  };

  const handleCancel = () => {
    if (mode === "add") {
      navigate(config.path);
      return;
    }
    resetForm();
    setMode("view");
  };

  const handleSave = (intent: "draft" | "submit") => {
    if (
      mode === "edit" &&
      performance.now() - editActivatedAtRef.current < 500
    ) {
      return;
    }
    if (mode === "add") {
      setDocumentStatus(intent === "draft" ? "Draft" : "Pending");
      setMode("view");
      navigate(`${config.path}/${documents[0].id}`, { replace: true });
      return;
    }
    setDocumentStatus(intent === "draft" ? "Draft" : "Pending");
    setMode("view");
    toast.success(intent === "draft" ? t("draftSaved") : t("submitted"));
  };

  const handleCopy = () => {
    navigate(`${config.path}/new`);
    setDocumentStatus("Draft");
    setMode("add");
    toast.success(t("copiedToNew"));
  };

  const applyTemplate = () => {
    setValues((current) => ({
      ...current,
      description: t("templateDescription"),
    }));
    setLines(INITIAL_LINES);
    setMode(isNew ? "add" : "edit");
    toast.success(t("templateApplied"));
  };

  const applyAiSuggestion = () => {
    setValues((current) => ({
      ...current,
      description: t("suggestedDescription"),
    }));
    setLines((current) =>
      current.map((line, index) => ({
        ...line,
        comment: index === 0 ? t("suggestedDebitComment") : line.comment,
      })),
    );
    setMode(isNew ? "add" : "edit");
    toast.success(t("suggestionApplied"));
  };

  const deleteSelectedLines = () => {
    setLines((current) =>
      current.filter((line) => !selectedLineIds.includes(line.id)),
    );
    setSelectedLineIds([]);
    toast.success(t("rowsDeleted"));
  };

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  const variance = Math.abs(totalDebit - totalCredit);
  const isBalanced = lines.length > 0 && variance < 0.005;
  const summaryMetrics = [
    { label: t("totalTransDebit"), value: totalDebit, color: "text-primary" },
    {
      label: t("totalTransCredit"),
      value: totalCredit,
      color: "text-success-foreground",
    },
    { label: t("totalBaseDebit"), value: totalDebit, color: "text-primary" },
    {
      label: t("totalBaseCredit"),
      value: totalCredit,
      color: "text-success-foreground",
    },
    {
      label: t("variance"),
      value: variance,
      color: isBalanced ? "text-muted-foreground" : "text-destructive",
    },
  ];
  const entryTitle =
    config.kind === "journalVoucher"
      ? t("journalEntryDetails")
      : t("entryDetails");

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(config.path)}
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Button>
          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setValues((current) => ({
                ...current,
                description: "",
                party: "",
              }));
              setLines(INITIAL_LINES);
              setSelectedLineIds([]);
              setDocumentStatus("Draft");
              setMode("add");
              navigate(`${config.path}/new`);
            }}
          >
            <FilePlus2 className="size-4" aria-hidden="true" />
            {t("new")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="size-4" aria-hidden="true" />
            {t("copy")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={applyTemplate}
          >
            <LayoutTemplate className="size-4" aria-hidden="true" />
            {t("template")}
          </Button>
          {!isNew && documentStatus !== "Voided" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setDocumentStatus("Voided");
                setMode("view");
                toast.success(t("voided"));
              }}
            >
              <Ban className="size-4" aria-hidden="true" />
              {t("void")}
            </Button>
          )}
          <span className="bg-border mx-1 hidden h-5 w-px sm:block" />
          <Button
            type="button"
            variant="warning"
            size="sm"
            onClick={applyAiSuggestion}
          >
            <WandSparkles className="size-4" aria-hidden="true" />
            {t("aiSuggest")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setUtilityPanel("attachments")}
          >
            <Paperclip className="size-4" aria-hidden="true" />
            {t("attachments")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setUtilityPanel("log")}
          >
            <History className="size-4" aria-hidden="true" />
            {t("log")}
          </Button>
          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
          {isView ? (
            <Button
              type="button"
              size="sm"
              disabled={documentStatus === "Voided"}
              onClick={() => {
                editActivatedAtRef.current = performance.now();
                setMode("edit");
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {tc("edit")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <X className="size-4" aria-hidden="true" />
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="outline"
                size="sm"
                data-intent="draft"
                disabled={!isBalanced}
                aria-describedby={
                  !isBalanced ? "journal-balance-status" : undefined
                }
              >
                <Save className="size-4" aria-hidden="true" />
                {t("saveDraft")}
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                size="sm"
                data-intent="submit"
                disabled={!isBalanced}
                aria-describedby={
                  !isBalanced ? "journal-balance-status" : undefined
                }
              >
                <Send className="size-4" aria-hidden="true" />
                {t("submit")}
              </Button>
            </>
          )}
        </div>
      </header>

      <form
        id={FORM_ID}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const intent = (
            event.nativeEvent as SubmitEvent
          ).submitter?.getAttribute("data-intent");
          handleSave(intent === "draft" ? "draft" : "submit");
        }}
      >
        <Card className="gap-3 py-4">
          <CardContent
            className={`grid gap-4 px-4 sm:grid-cols-2 ${
              config.kind === "journalVoucher" ||
              config.kind === "financialReports"
                ? "lg:grid-cols-6"
                : "lg:grid-cols-8"
            }`}
          >
            <Field>
              <FieldLabel>{t("prefix")}</FieldLabel>
              <FieldPlainText>{t(`${config.kind}.single`)}</FieldPlainText>
            </Field>
            <Field>
              <FieldLabel>{t("number")}</FieldLabel>
              <FieldPlainText className="tabular-nums">{number}</FieldPlainText>
            </Field>
            <Field>
              <FieldLabel>{t("date")}</FieldLabel>
              <DatePicker
                value={values.date}
                onValueChange={(date) =>
                  setValues((current) => ({ ...current, date }))
                }
                readOnly={isView}
                hideClear
                className="w-full"
              />
            </Field>
            <Field className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="document-description">
                {t("description")}
              </FieldLabel>
              {isView ? (
                <FieldPlainText>{values.description}</FieldPlainText>
              ) : (
                <Input
                  id="document-description"
                  size="sm"
                  value={values.description}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              )}
            </Field>
            {config.kind !== "journalVoucher" && (
              <>
                <Field className="sm:col-span-2 lg:col-span-2">
                  <FieldLabel htmlFor="document-party">{t("party")}</FieldLabel>
                  {isView ? (
                    <FieldPlainText>{values.party}</FieldPlainText>
                  ) : (
                    <Input
                      id="document-party"
                      size="sm"
                      value={values.party}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          party: event.target.value,
                        }))
                      }
                    />
                  )}
                </Field>
                {config.kind === "financialReports" && (
                  <Field>
                    <FieldLabel>{t("approval")}</FieldLabel>
                    <FieldPlainText>{t("pendingController")}</FieldPlainText>
                  </Field>
                )}
                {config.kind === "financialReports" && (
                  <>
                    <Field>
                      <FieldLabel>{t("source")}</FieldLabel>
                      <FieldPlainText className="tabular-nums">
                        AP-102934
                      </FieldPlainText>
                    </Field>
                    <Field>
                      <FieldLabel>{t("status")}</FieldLabel>
                      <div className="flex min-h-8 items-center">
                        <Badge
                          variant={
                            documentStatus === "Voided"
                              ? "destructive"
                              : documentStatus === "Pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {documentStatus}
                        </Badge>
                      </div>
                    </Field>
                  </>
                )}
              </>
            )}
          </CardContent>
          {config.kind !== "financialReports" && (
            <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-4 pt-3">
              {config.kind === "journalVoucher" && (
                <>
                  <div className="flex min-h-8 min-w-52 items-center gap-3">
                    {isView ? (
                      <Badge
                        variant={values.schedulePost ? "secondary" : "outline"}
                      >
                        {values.schedulePost ? tc("yes") : tc("no")}
                      </Badge>
                    ) : (
                      <Switch
                        id="schedule-post"
                        aria-label={t("schedulePost")}
                        checked={values.schedulePost}
                        onCheckedChange={(schedulePost) =>
                          setValues((current) => ({
                            ...current,
                            schedulePost,
                          }))
                        }
                      />
                    )}
                    <FieldLabel htmlFor="schedule-post" className="shrink-0">
                      {t("schedulePost")}
                    </FieldLabel>
                    {values.schedulePost && (
                      <DatePicker
                        value={values.scheduleDate}
                        onValueChange={(scheduleDate) =>
                          setValues((current) => ({ ...current, scheduleDate }))
                        }
                        readOnly={isView}
                        hideClear
                        className="ml-auto w-28"
                      />
                    )}
                  </div>

                  <span
                    className="bg-border hidden h-8 w-px lg:block"
                    aria-hidden="true"
                  />

                  <div className="flex min-h-8 min-w-52 items-center gap-3">
                    {isView ? (
                      <Badge
                        variant={values.autoReverse ? "secondary" : "outline"}
                      >
                        {values.autoReverse ? tc("yes") : tc("no")}
                      </Badge>
                    ) : (
                      <Switch
                        id="auto-reverse"
                        aria-label={t("autoReverse")}
                        checked={values.autoReverse}
                        onCheckedChange={(autoReverse) =>
                          setValues((current) => ({ ...current, autoReverse }))
                        }
                      />
                    )}
                    <FieldLabel htmlFor="auto-reverse" className="shrink-0">
                      {t("autoReverse")}
                    </FieldLabel>
                    {values.autoReverse && (
                      <DatePicker
                        value={values.reverseDate}
                        onValueChange={(reverseDate) =>
                          setValues((current) => ({ ...current, reverseDate }))
                        }
                        readOnly={isView}
                        hideClear
                        className="ml-auto w-28"
                      />
                    )}
                  </div>

                  <span
                    className="bg-border hidden h-8 w-px lg:block"
                    aria-hidden="true"
                  />
                </>
              )}

              {hasInlineApproval && (
                <>
                  <div className="flex min-h-8 items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {t("approval")}
                    </span>
                    <span className="font-medium">
                      {t("pendingController")}
                    </span>
                  </div>
                  <span
                    className="bg-border hidden h-8 w-px xl:block"
                    aria-hidden="true"
                  />
                </>
              )}

              {hasWorkflowApproval && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t("approvalWorkflow")}
                      className="gap-0.5 px-1.5"
                    >
                      <span className="bg-success flex size-5 items-center justify-center rounded-full text-micro-legal font-semibold text-black">
                        ✓
                      </span>
                      <span className="bg-success/60 h-px w-2" />
                      <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-micro-legal font-semibold">
                        2
                      </span>
                      <span className="bg-border h-px w-2" />
                      <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-full border text-micro-legal font-semibold">
                        3
                      </span>
                      <span className="sr-only">{t("approvalController")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="end"
                    className="w-80 max-w-[calc(100vw-2rem)] p-3"
                  >
                    <p className="mb-2 text-xs font-medium">
                      {t("approvalWorkflow")}
                    </p>
                    <WorkflowTrack
                      previousStage={t("approvalPrepared")}
                      currentStage={t("approvalController")}
                      nextStage={t("approvalApproved")}
                    />
                  </TooltipContent>
                </Tooltip>
              )}

              {hasWorkflowApproval && (
                <span
                  className="bg-border hidden h-8 w-px xl:block"
                  aria-hidden="true"
                />
              )}

              <div className="ml-auto flex min-h-8 items-center gap-3 text-xs">
                <span className="text-muted-foreground">{t("source")}</span>
                <span className="text-primary font-medium tabular-nums">
                  AP-102934
                </span>
                <span className="bg-border h-4 w-px" aria-hidden="true" />
                <span className="text-muted-foreground">{t("status")}</span>
                <Badge
                  variant={
                    documentStatus === "Voided"
                      ? "destructive"
                      : documentStatus === "Pending"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {documentStatus}
                </Badge>
              </div>
            </CardContent>
          )}
        </Card>

        <Card
          className={`gap-3 py-4 ${
            config.kind === "financialReports"
              ? "h-[calc(100dvh-25rem)] min-h-64"
              : "h-[calc(100dvh-21rem)] min-h-80"
          }`}
        >
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ListTree className="text-primary size-4" aria-hidden="true" />
              {entryTitle}
            </CardTitle>
            {!isView && (
              <CardAction className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedLineIds.length === 0}
                  onClick={deleteSelectedLines}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {tc("delete")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={addLine}
                  title={t("addRowShortcut")}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t("addRow")}
                  <kbd className="bg-primary-foreground/15 text-micro-legal rounded px-1">
                    Alt+A
                  </kbd>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col px-0">
            <div className="min-h-0 flex-1 overflow-auto border-y">
              <table className="w-full min-w-5xl text-xs">
                <thead className="bg-muted sticky top-0 z-10 border-b">
                  <tr>
                    <th className="h-10 w-16 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <Checkbox
                          aria-label={t("selectAllRows")}
                          checked={
                            allLinesSelected
                              ? true
                              : someLinesSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(checked) =>
                            setSelectedLineIds(
                              checked ? lines.map((line) => line.id) : [],
                            )
                          }
                        />
                        <span className="text-muted-foreground min-w-4 text-center">
                          #
                        </span>
                      </div>
                    </th>
                    <th className="h-10 px-3 text-left font-medium">
                      {t("department")}
                    </th>
                    <th className="h-10 px-3 text-left font-medium">
                      {t("accountCode")}
                    </th>
                    <th className="h-10 px-3 text-left font-medium">
                      {t("comment")}
                    </th>
                    <th className="h-10 px-3 text-left font-medium">
                      {t("currency")}
                    </th>
                    <th className="h-10 px-3 text-right font-medium">
                      {t("rate")}
                    </th>
                    <th className="h-10 px-3 text-right font-medium">
                      {t("debit")}
                    </th>
                    <th className="h-10 px-3 text-right font-medium">
                      {t("credit")}
                    </th>
                    <th className="h-10 px-3 text-right font-medium">
                      <span className="sr-only">{tc("rowActions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, lineIndex) => {
                    const isSelected = selectedLineIds.includes(line.id);
                    return (
                      <Fragment key={line.id}>
                        <tr className={isSelected ? "bg-muted/30" : undefined}>
                          <td className="h-12 w-16 px-2">
                            <div className="flex items-center justify-center gap-2">
                              <Checkbox
                                aria-label={t("selectRow", { id: line.id })}
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  setSelectedLineIds((current) =>
                                    checked
                                      ? [...current, line.id]
                                      : current.filter((id) => id !== line.id),
                                  )
                                }
                              />
                              <span className="text-muted-foreground min-w-4 text-center tabular-nums">
                                {lineIndex + 1}
                              </span>
                            </div>
                          </td>
                          <td className="h-12 px-3">
                            {isView ? (
                              optionLabel(DEPARTMENTS, line.department)
                            ) : (
                              <LookupCombobox
                                value={line.department}
                                onValueChange={(department) =>
                                  updateLine(line.id, { department })
                                }
                                items={DEPARTMENTS}
                                getId={(option) => option.id}
                                getLabel={(option) => option.label}
                                placeholder={t("selectDepartment")}
                                searchPlaceholder={t("searchDepartment")}
                                className="min-w-44"
                              />
                            )}
                          </td>
                          <td className="h-12 px-3 font-medium">
                            {isView ? (
                              optionLabel(ACCOUNTS, line.account)
                            ) : (
                              <LookupCombobox
                                value={line.account}
                                onValueChange={(account) =>
                                  updateLine(line.id, { account })
                                }
                                items={ACCOUNTS}
                                getId={(option) => option.id}
                                getLabel={(option) => option.label}
                                placeholder={t("selectAccount")}
                                searchPlaceholder={t("searchAccount")}
                                className="min-w-52"
                              />
                            )}
                          </td>
                          <td className="h-12 px-3">
                            {isView ? (
                              line.comment
                            ) : (
                              <Input
                                size="sm"
                                value={line.comment}
                                onChange={(event) =>
                                  updateLine(line.id, {
                                    comment: event.target.value,
                                  })
                                }
                                className="min-w-48"
                              />
                            )}
                          </td>
                          <td className="h-12 px-3">THB</td>
                          <td className="h-12 px-3 text-right tabular-nums">
                            1
                          </td>
                          <td className="h-12 px-3 text-right tabular-nums">
                            {isView ? (
                              line.debit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                value={line.debit}
                                onChange={(event) =>
                                  updateLine(line.id, {
                                    debit: Number(event.target.value),
                                  })
                                }
                                className="min-w-28 text-right tabular-nums"
                              />
                            )}
                          </td>
                          <td className="h-12 px-3 text-right tabular-nums">
                            {isView ? (
                              line.credit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                value={line.credit}
                                onChange={(event) =>
                                  updateLine(line.id, {
                                    credit: Number(event.target.value),
                                  })
                                }
                                className="min-w-28 text-right tabular-nums"
                              />
                            )}
                          </td>
                          <td
                            rowSpan={2}
                            className="w-16 border-l px-1 align-middle"
                          >
                            <div className="mx-auto grid w-fit grid-cols-2 place-items-center gap-1 p-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={t("taxDetail")}
                                title={t("taxDetail")}
                                onClick={() => openLineDetail(line.id, "tax")}
                              >
                                <ReceiptText
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={t("checkBudget")}
                                title={t("checkBudget")}
                                onClick={() =>
                                  openLineDetail(line.id, "budget")
                                }
                              >
                                <CircleDollarSign
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className={isView ? "col-span-2" : undefined}
                                aria-label={t("allDimensions")}
                                title={t("allDimensions")}
                                onClick={() =>
                                  openLineDetail(line.id, "dimension")
                                }
                              >
                                <Boxes className="size-4" aria-hidden="true" />
                              </Button>
                              {!isView && lines.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label={t("removeRow")}
                                  onClick={() => {
                                    setLines((current) =>
                                      current.filter(
                                        (candidate) => candidate.id !== line.id,
                                      ),
                                    );
                                    setSelectedLineIds((current) =>
                                      current.filter((id) => id !== line.id),
                                    );
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        <tr
                          className={`bg-muted/20 border-b ${isSelected ? "bg-muted/40" : ""}`}
                        >
                          <td className="w-16 px-2 py-0.5">
                            {!isView && (
                              <div className="bg-muted/40 mx-auto flex w-fit rounded-md border p-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="size-5 rounded-sm"
                                  disabled={lineIndex === 0}
                                  aria-label={t("moveRowUp", {
                                    row: lineIndex + 1,
                                  })}
                                  onClick={() => moveLine(line.id, -1)}
                                >
                                  <ChevronUp aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="size-5 rounded-sm"
                                  disabled={lineIndex === lines.length - 1}
                                  aria-label={t("moveRowDown", {
                                    row: lineIndex + 1,
                                  })}
                                  onClick={() => moveLine(line.id, 1)}
                                >
                                  <ChevronDown aria-hidden="true" />
                                </Button>
                              </div>
                            )}
                          </td>
                          <td colSpan={4} className="px-3 py-0.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() =>
                                  openLineDetail(line.id, "dimension")
                                }
                              >
                                {t("dimension")}:{" "}
                                {optionLabel(DIMENSIONS, line.dimension) || "-"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => openLineDetail(line.id, "tax")}
                              >
                                {t("taxCode")}:{" "}
                                {optionLabel(TAX_CODES, line.taxCode) || "-"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() =>
                                  openLineDetail(line.id, "budget")
                                }
                              >
                                {t("budget")}:{" "}
                                {optionLabel(BUDGETS, line.budget) || "-"}
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-0.5" />
                          <td className="px-3 py-0.5 text-right tabular-nums">
                            <span className="text-muted-foreground block text-micro-legal">
                              {t("baseDebit")}
                            </span>
                            <span className="text-primary font-semibold">
                              {line.debit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-0.5 text-right tabular-nums">
                            <span className="text-muted-foreground block text-micro-legal">
                              {t("baseCredit")}
                            </span>
                            <span className="text-success-foreground font-semibold">
                              {line.credit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div
              id="journal-balance-status"
              className={`flex shrink-0 items-center justify-between gap-4 overflow-x-auto border-b px-3 py-2 font-medium ${
                isBalanced ? "bg-success/10" : "bg-destructive/10"
              }`}
              aria-live="polite"
            >
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" size="sm">
                  {t("rowCount", { count: lines.length })}
                </Badge>
                <Badge
                  variant={isBalanced ? "success-light" : "destructive-light"}
                  size="sm"
                >
                  {isBalanced ? t("balanced") : t("unbalanced")}
                </Badge>
              </div>
              <div className="grid min-w-[40rem] shrink-0 grid-cols-5 divide-x">
                {summaryMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="grid justify-items-end gap-0.5 px-3"
                  >
                    <span className="text-muted-foreground text-micro-legal font-medium">
                      {metric.label}
                    </span>
                    <span
                      className={`${metric.color} font-semibold tabular-nums`}
                    >
                      {metric.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      <Sheet
        open={!!selectedLine}
        onOpenChange={(open) => !open && setSelectedLineId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pr-12">
            <div>
              <SheetTitle>
                {t(
                  lineDetailSection === "tax"
                    ? "taxDetail"
                    : lineDetailSection === "budget"
                      ? "checkBudget"
                      : "allDimensions",
                )}
              </SheetTitle>
              <SheetDescription>{t("lineDetailsDescription")}</SheetDescription>
            </div>
          </SheetHeader>
          {selectedLine && (
            <div className="grid gap-5 px-4 pb-6">
              <Field>
                <FieldLabel>{t("department")}</FieldLabel>
                {isView ? (
                  <FieldPlainText>
                    {optionLabel(DEPARTMENTS, selectedLine.department)}
                  </FieldPlainText>
                ) : (
                  <LookupCombobox
                    value={selectedLine.department}
                    onValueChange={(department) =>
                      updateLine(selectedLine.id, { department })
                    }
                    items={DEPARTMENTS}
                    getId={(option) => option.id}
                    getLabel={(option) => option.label}
                    placeholder={t("selectDepartment")}
                    searchPlaceholder={t("searchDepartment")}
                    className="w-full"
                  />
                )}
              </Field>
              <Field>
                <FieldLabel>{t("accountCode")}</FieldLabel>
                {isView ? (
                  <FieldPlainText>
                    {optionLabel(ACCOUNTS, selectedLine.account)}
                  </FieldPlainText>
                ) : (
                  <LookupCombobox
                    value={selectedLine.account}
                    onValueChange={(account) =>
                      updateLine(selectedLine.id, { account })
                    }
                    items={ACCOUNTS}
                    getId={(option) => option.id}
                    getLabel={(option) => option.label}
                    placeholder={t("selectAccount")}
                    searchPlaceholder={t("searchAccount")}
                    className="w-full"
                  />
                )}
              </Field>
              <Field>
                <FieldLabel>{t("comment")}</FieldLabel>
                {isView ? (
                  <FieldPlainText>{selectedLine.comment}</FieldPlainText>
                ) : (
                  <Input
                    size="sm"
                    value={selectedLine.comment}
                    onChange={(event) =>
                      updateLine(selectedLine.id, {
                        comment: event.target.value,
                      })
                    }
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("debit")}</FieldLabel>
                  {isView ? (
                    <FieldPlainText className="tabular-nums">
                      {selectedLine.debit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      THB
                    </FieldPlainText>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      size="sm"
                      value={selectedLine.debit}
                      onChange={(event) =>
                        updateLine(selectedLine.id, {
                          debit: Number(event.target.value),
                        })
                      }
                      className="text-right tabular-nums"
                    />
                  )}
                </Field>
                <Field>
                  <FieldLabel>{t("credit")}</FieldLabel>
                  {isView ? (
                    <FieldPlainText className="tabular-nums">
                      {selectedLine.credit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      THB
                    </FieldPlainText>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      size="sm"
                      value={selectedLine.credit}
                      onChange={(event) =>
                        updateLine(selectedLine.id, {
                          credit: Number(event.target.value),
                        })
                      }
                      className="text-right tabular-nums"
                    />
                  )}
                </Field>
              </div>

              {lineDetailSection === "tax" && (
                <section className="grid gap-4 border-t pt-5">
                  <h3 className="text-sm font-semibold">{t("taxWhtConfig")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>{t("taxCode")}</FieldLabel>
                      {isView ? (
                        <FieldPlainText>
                          {optionLabel(TAX_CODES, selectedLine.taxCode)}
                        </FieldPlainText>
                      ) : (
                        <LookupCombobox
                          value={selectedLine.taxCode}
                          onValueChange={(taxCode) =>
                            updateLine(selectedLine.id, { taxCode })
                          }
                          items={TAX_CODES}
                          getId={(option) => option.id}
                          getLabel={(option) => option.label}
                          placeholder={t("selectTaxCode")}
                          searchPlaceholder={t("searchTaxCode")}
                          className="w-full"
                        />
                      )}
                    </Field>
                    <Field>
                      <FieldLabel>{t("whtCode")}</FieldLabel>
                      {isView ? (
                        <FieldPlainText>
                          {optionLabel(WHT_CODES, selectedLine.whtCode)}
                        </FieldPlainText>
                      ) : (
                        <LookupCombobox
                          value={selectedLine.whtCode}
                          onValueChange={(whtCode) =>
                            updateLine(selectedLine.id, { whtCode })
                          }
                          items={WHT_CODES}
                          getId={(option) => option.id}
                          getLabel={(option) => option.label}
                          placeholder={t("selectWhtCode")}
                          searchPlaceholder={t("searchWhtCode")}
                          className="w-full"
                        />
                      )}
                    </Field>
                  </div>
                </section>
              )}

              {lineDetailSection === "budget" && (
                <section className="grid gap-4 border-t pt-5">
                  <h3 className="text-sm font-semibold">
                    {t("budgetControl")}
                  </h3>
                  <div className="flex min-h-8 items-center justify-between gap-4">
                    <FieldLabel htmlFor="budget-control">
                      {t("applyBudgetControl")}
                    </FieldLabel>
                    {isView ? (
                      <Badge
                        variant={
                          selectedLine.budgetControlled
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {selectedLine.budgetControlled ? tc("yes") : tc("no")}
                      </Badge>
                    ) : (
                      <Switch
                        id="budget-control"
                        checked={selectedLine.budgetControlled}
                        onCheckedChange={(budgetControlled) =>
                          updateLine(selectedLine.id, { budgetControlled })
                        }
                      />
                    )}
                  </div>
                  <Field>
                    <FieldLabel>{t("budget")}</FieldLabel>
                    {isView ? (
                      <FieldPlainText>
                        {optionLabel(BUDGETS, selectedLine.budget)}
                      </FieldPlainText>
                    ) : (
                      <LookupCombobox
                        value={selectedLine.budget}
                        onValueChange={(budget) =>
                          updateLine(selectedLine.id, { budget })
                        }
                        items={BUDGETS}
                        getId={(option) => option.id}
                        getLabel={(option) => option.label}
                        placeholder={t("selectBudget")}
                        searchPlaceholder={t("searchBudget")}
                        disabled={!selectedLine.budgetControlled}
                        className="w-full"
                      />
                    )}
                  </Field>
                </section>
              )}

              {lineDetailSection === "dimension" && (
                <section className="grid gap-4 border-t pt-5">
                  <h3 className="text-sm font-semibold">{t("dimension")}</h3>
                  <Field>
                    <FieldLabel>{t("dimension")}</FieldLabel>
                    {isView ? (
                      <FieldPlainText>
                        {optionLabel(DIMENSIONS, selectedLine.dimension)}
                      </FieldPlainText>
                    ) : (
                      <LookupCombobox
                        value={selectedLine.dimension}
                        onValueChange={(dimension) =>
                          updateLine(selectedLine.id, { dimension })
                        }
                        items={DIMENSIONS}
                        getId={(option) => option.id}
                        getLabel={(option) => option.label}
                        placeholder={t("selectDimension")}
                        searchPlaceholder={t("searchDimension")}
                        className="w-full"
                      />
                    )}
                  </Field>
                </section>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!utilityPanel}
        onOpenChange={(open) => !open && setUtilityPanel(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {utilityPanel === "attachments" ? t("attachments") : t("log")}
            </SheetTitle>
            <SheetDescription>
              {utilityPanel === "attachments"
                ? t("attachmentsDescription")
                : t("logDescription")}
            </SheetDescription>
          </SheetHeader>

          {utilityPanel === "attachments" ? (
            <div className="grid gap-3 px-4 pb-6">
              <label className="border-border hover:bg-accent flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm font-medium transition-colors">
                <Paperclip className="size-4" aria-hidden="true" />
                {t("uploadAttachment")}
                <input
                  type="file"
                  className="sr-only"
                  onChange={(event) => {
                    if (!event.target.files?.length) return;
                    toast.success(
                      t("attachmentAdded", {
                        name: event.target.files[0].name,
                      }),
                    );
                    event.target.value = "";
                  }}
                />
              </label>
              {["JV2607-0002.pdf", "utility-invoice.pdf"].map((file) => (
                <div
                  key={file}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Paperclip
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm">{file}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={tc("delete")}
                    onClick={() => toast.success(t("attachmentRemoved"))}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <ol className="grid gap-4 px-4 pb-6">
              {[
                [t("logCreated"), "07 Jul 2026 · 09:14"],
                [t("logUpdated"), "07 Jul 2026 · 09:28"],
                [t("logReviewed"), "07 Jul 2026 · 10:02"],
              ].map(([label, time]) => (
                <li key={label} className="flex gap-3">
                  <span
                    className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-muted-foreground text-xs">{time}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
