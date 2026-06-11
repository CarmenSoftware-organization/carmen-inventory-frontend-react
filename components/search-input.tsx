
import { useState, useEffect, memo } from "react";
import type { KeyboardEvent } from "react";

import { useTranslations } from "use-intl";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface Props {
  readonly defaultValue: string;
  readonly onSearch: (value: string) => void;
  readonly containerClassName?: string;
  readonly buttonClassName?: string;
  readonly inputClassName?: string;
  readonly onInputChange?: (value: string) => void;
}

const SearchInput = memo(function SearchInput({
  defaultValue,
  onSearch,
  containerClassName = "w-full md:w-[15.625rem] xl:w-[23.75rem]",
  buttonClassName = "absolute right-0 top-0 h-full px-2 text-muted-foreground hover:bg-transparent hover:text-muted-foreground/80",
  inputClassName = "h-8 placeholder:text-xs",
  onInputChange,
}: Props) {
  const t = useTranslations("common");
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(e.currentTarget.value);
    }
  };

  const handleSearch = () => {
    onSearch(inputValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    if (onInputChange) {
      onInputChange(event.target.value);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onSearch("");
    if (onInputChange) {
      onInputChange("");
    }
  };

  return (
    <div className="flex gap-2">
      <div className={`relative ${containerClassName}`}>
        <Input
          name="search"
          placeholder={t("search")}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(inputClassName)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={inputValue ? handleClear : handleSearch}
          className={buttonClassName}
          aria-label={inputValue ? t("clearSearch") : t("search")}
        >
          {inputValue ? (
            <X className="text-muted-foreground h-3.5 w-3.5" />
          ) : (
            <Search className="text-muted-foreground h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
});

export default SearchInput;
