
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { ArrowLeft, FileText, LayoutTemplate, Loader2 } from "lucide-react";
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
  const navigate = useNavigate();
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
    navigate("/procurement/purchase-request/new");
  };

  const handleSelectTemplate = (templateId: string) => {
    handleOpenChange(false);
    navigate(`/procurement/purchase-request/new?template_id=${templateId}`);
  };

  const handleBackToChoice = () => {
    setView("choice");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        {view === "choice" ? (
          <div className="space-y-5 p-6">
            <DialogHeader>
              <DialogTitle className="text-base">
                {t("createTitle")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("createDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleBlankPR}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
              >
                <FileText className="text-foreground size-5" />
                <div className="space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t("blankPr")}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("blankPrDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setView("template")}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
              >
                <LayoutTemplate className="text-primary size-5" />
                <div className="space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t("fromTemplate")}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("fromTemplateDesc")}
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[85vh] flex-col gap-4 p-6">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleBackToChoice}
                  aria-label={tc("goBack")}
                  className="shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div className="min-w-0 flex-1">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
