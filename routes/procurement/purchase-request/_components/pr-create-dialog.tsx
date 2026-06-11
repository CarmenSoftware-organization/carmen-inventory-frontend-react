
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import {
  ArrowLeft,
  FileText,
  LayoutTemplate,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePurchaseRequestTemplates } from "@/hooks/use-purchase-request";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import PrSelectTemplate from "./pr-select-template";

interface CreatePRDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CreatePRDialog({ open, onOpenChange }: CreatePRDialogProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const router = useRouter();
  const [view, setView] = useState<"choice" | "template">("choice");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: templates, isLoading } = usePurchaseRequestTemplates(
    view === "template",
  );

  const filteredTemplates = (() => {
    if (!templates) return [];
    if (!searchTerm.trim()) return templates;

    const term = searchTerm.toLowerCase();
    return templates.filter(
      (template) =>
        template.name?.toLowerCase().includes(term) ||
        template.department_name?.toLowerCase().includes(term) ||
        template.workflow_name?.toLowerCase().includes(term),
    );
  })();

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setView("choice");
      setSearchTerm("");
    }
  };

  const handleBlankPR = () => {
    handleOpenChange(false);
    router.push("/procurement/purchase-request/new");
  };

  const handleSelectTemplate = (templateId: string) => {
    handleOpenChange(false);
    router.push(`/procurement/purchase-request/new?template_id=${templateId}`);
  };

  const handleBackToChoice = () => {
    setView("choice");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        {view === "choice" ? (
          <>            <div className="relative space-y-5 p-6">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <LayoutTemplate className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="bg-primary/10 text-primary mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium">
                      {t("getStarted")}
                    </div>
                    <DialogTitle className="text-base">
                      {t("createTitle")}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {t("createDesc")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBlankPR}
                  className="group hover:border-warning/40 bg-card focus-visible:ring-warning/40 relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2"
                >
                  <div
                    className="bg-warning/40 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
                    aria-hidden="true"
                  />
                  <div className="bg-warning/10 text-warning flex size-10 items-center justify-center rounded-lg">
                    <FileText className="size-5" />
                  </div>
                  <div className="relative space-y-0.5">
                    <h3 className="text-sm font-semibold">{t("blankPr")}</h3>
                    <p className="text-muted-foreground text-[0.6875rem] font-medium">
                      {t("blankPrSubtitle")}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                      {t("blankPrDesc")}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setView("template")}
                  className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2"
                >
                  <div
                    className="bg-primary/40 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
                    aria-hidden="true"
                  />
                  <span className="bg-primary/10 text-primary absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
                    <Sparkles className="size-2.5" />
                    {t("recommended")}
                  </span>
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <LayoutTemplate className="size-5" />
                  </div>
                  <div className="relative space-y-0.5">
                    <h3 className="text-sm font-semibold">
                      {t("fromTemplate")}
                    </h3>
                    <p className="text-muted-foreground text-[0.6875rem] font-medium">
                      {t("fromTemplateSubtitle")}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                      {t("fromTemplateDesc")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>            <div className="relative flex max-h-[85vh] flex-col gap-4 p-6">
              <DialogHeader>
                <div className="flex items-start gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={handleBackToChoice}
                    aria-label={tc("goBack")}
                    className="shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <LayoutTemplate className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="bg-primary/10 text-primary mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium">
                      {t("fromTemplate")}
                    </div>
                    <DialogTitle className="text-base">
                      {t("selectTemplate")}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {t("selectTemplateDesc")}
                    </DialogDescription>
                  </div>
                  {!isLoading && templates && templates.length > 0 && (
                    <Badge
                      variant="outline"
                      size="xs"
                      className="mt-1 shrink-0 tabular-nums"
                    >
                      {filteredTemplates.length}/{templates.length}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {!isLoading && templates && templates.length > 0 && (
                <SearchInput
                  defaultValue={searchTerm}
                  onSearch={setSearchTerm}
                  onInputChange={setSearchTerm}
                  containerClassName="w-full"
                  inputClassName="h-9 text-sm"
                />
              )}

              <ScrollArea className="-mx-1 max-h-112 flex-1 overflow-hidden px-1">
                <div className="space-y-2">
                  {isLoading && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="text-muted-foreground size-6 animate-spin" />
                    </div>
                  )}
                  {!isLoading &&
                    filteredTemplates.length > 0 &&
                    filteredTemplates.map((template) => (
                      <PrSelectTemplate
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                      />
                    ))}
                  {!isLoading &&
                    templates &&
                    templates.length > 0 &&
                    filteredTemplates.length === 0 && (
                      <div className="py-8">
                        <EmptyComponent
                          title={t("noTemplateResults")}
                          description={t("tryDifferentSearch")}
                        />
                      </div>
                    )}
                  {!isLoading && (!templates || templates.length === 0) && (
                    <div className="py-8">
                      <EmptyComponent
                        title={t("noTemplates")}
                        description={t("noTemplatesDesc")}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
