import { useTranslations } from "use-intl";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommentButtonProps {
  readonly count?: number;
  readonly onClick: () => void;
}

export function CommentButton({ count, onClick }: CommentButtonProps) {
  const tc = useTranslations("common");
  const label = count ? `${tc("comment")} (${count})` : tc("comment");

  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <MessageSquare aria-hidden="true" />
      {label}
    </Button>
  );
}
