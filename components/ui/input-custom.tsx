
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";
import {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  id?: string;
  label?: string;
  labelPlacement?: "top" | "left" | "right" | "inside" | "overTheLine";
  error?: string;
  isRequired?: boolean;
  startContent?: ReactNode;
  endContent?: ReactNode;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  showPasswordToggle?: boolean;
  onValidation?: (isValid: boolean, errorMessage?: string) => void;
  validationMessages?: {
    fieldRequired?: string;
    minLength?: string;
    maxLength?: string;
    invalidFormat?: string;
  };
}

/**
 * Input แบบ advanced รองรับ label หลายตำแหน่งและ validation ในตัว
 *
 * labelPlacement: "top" (default), "left", "right", "inside" (floating label
 * ลอยเมื่อ focus/มีค่า), "overTheLine" (badge border) รองรับ internal
 * validation (required, minLength, maxLength, pattern) พร้อม onValidation
 * callback, show/hide password toggle, startContent/endContent icon slots
 * และ aria-invalid/aria-describedby สำหรับ screen reader
 *
 * หมายเหตุ: ในโปรเจกต์นี้ฟอร์มหลักใช้ shadcn Input + react-hook-form
 * component นี้เก็บไว้เผื่อหน้าพิเศษที่ต้องการ floating label
 *
 * @param props - ตาม InputProps (label, labelPlacement, validation, toggles)
 * @returns JSX element input wrapper พร้อม label และ error message
 * @example
 * ```tsx
 * <InputCustom
 *   label="Email"
 *   type="email"
 *   labelPlacement="inside"
 *   isRequired
 *   pattern="^[^@]+@[^@]+$"
 * />
 * ```
 */
const InputCustom = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label = "",
      labelPlacement = "top",
      placeholder = "",
      className = "",
      required = false,
      isRequired = false,
      error,
      disabled = false,
      startContent,
      endContent,
      minLength,
      maxLength,
      pattern,
      type = "text",
      showPasswordToggle = true,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      onClick,
      onValidation,
      validationMessages,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState<string>("");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const generatedId = useId();

    const inputId = id ?? generatedId;
    const inputIsRequired = isRequired || required;

    const handleRef = (element: HTMLInputElement) => {
      inputRef.current = element;

      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    // Validation function
    const validateInput = useCallback(
      (inputValue: string): { isValid: boolean; errorMessage?: string } => {
        // Check required field
        if (inputIsRequired && inputValue.trim().length === 0) {
          return {
            isValid: false,
            errorMessage:
              validationMessages?.fieldRequired || "This field is required",
          };
        }

        // Check minimum length
        if (
          minLength &&
          inputValue.length < minLength &&
          inputValue.length > 0
        ) {
          return {
            isValid: false,
            errorMessage:
              validationMessages?.minLength || `Minimum length is ${minLength}`,
          };
        }

        // Check maximum length
        if (maxLength && inputValue.length > maxLength) {
          return {
            isValid: false,
            errorMessage:
              validationMessages?.maxLength || `Maximum length is ${maxLength}`,
          };
        }

        // Check pattern validation
        if (
          pattern &&
          inputValue.length > 0 &&
          !new RegExp(pattern).test(inputValue)
        ) {
          return {
            isValid: false,
            errorMessage: validationMessages?.invalidFormat || "Invalid format",
          };
        }

        return { isValid: true };
      },
      [inputIsRequired, minLength, maxLength, pattern, validationMessages],
    );

    // Check initial value immediately and when value/defaultValue changes
    useEffect(() => {
      const checkValue = () => {
        let currentValue = "";

        // For controlled components
        if (value !== undefined && value !== null) {
          currentValue = String(value);
        }
        // For uncontrolled with defaultValue
        else if (defaultValue !== undefined && defaultValue !== null) {
          currentValue = String(defaultValue);
        }
        // For uncontrolled with current DOM value
        else if (inputRef.current) {
          currentValue = inputRef.current.value;
        }

        setHasValue(currentValue.trim().length > 0);

        // Validate on mount if there's a value
        if (currentValue.trim().length > 0) {
          const validation = validateInput(currentValue);
          setValidationError(
            validation.isValid ? "" : validation.errorMessage || "",
          );
          onValidation?.(validation.isValid, validation.errorMessage);
        }
      };

      // Initial check
      checkValue();

      // Setup a small delay to ensure the DOM is updated
      const timer = setTimeout(checkValue, 0);

      return () => clearTimeout(timer);
    }, [value, defaultValue, validateInput, onValidation]);

    // Listen for focus changes to handle Tab navigation properly
    useEffect(() => {
      const handleFocusChange = () => {
        if (inputRef.current && document.activeElement === inputRef.current) {
          setFocused(true);
        }
      };

      // Check immediately
      handleFocusChange();

      // Listen for focus changes
      document.addEventListener("focusin", handleFocusChange);
      document.addEventListener("focusout", handleFocusChange);

      return () => {
        document.removeEventListener("focusin", handleFocusChange);
        document.removeEventListener("focusout", handleFocusChange);
      };
    }, []);

    // Memoize derived states to prevent unnecessary re-renders
    const derivedStates = useMemo(() => {
      const isPassword = type === "password";
      const shouldShowPasswordToggle = isPassword && showPasswordToggle;
      const actualType = isPassword && showPassword ? "text" : type;
      const needsTopPadding =
        labelPlacement === "inside" && (focused || hasValue);
      const shouldShrinkLabel = focused || hasValue;
      const finalError = error || validationError;

      return {
        isPassword,
        shouldShowPasswordToggle,
        actualType,
        needsTopPadding,
        shouldShrinkLabel,
        finalError,
      };
    }, [
      type,
      showPasswordToggle,
      showPassword,
      labelPlacement,
      focused,
      hasValue,
      error,
      validationError,
    ]);

    // Memoize input className to prevent unnecessary re-calculations
    const inputClassName = useMemo(() => {
      return cn(
        labelPlacement === "left" && "ml-2",
        labelPlacement === "right" && "mr-2",
        derivedStates.needsTopPadding && "pt-3",
        startContent && "pl-10",
        (endContent || derivedStates.shouldShowPasswordToggle) && "pr-10",
        derivedStates.finalError && "border-destructive focus:ring-destructive",
        className,
        "focus:outline-none",
      );
    }, [
      labelPlacement,
      derivedStates.needsTopPadding,
      startContent,
      endContent,
      derivedStates.shouldShowPasswordToggle,
      derivedStates.finalError,
      className,
    ]);

    // Memoize label className to prevent unnecessary re-calculations
    const labelClassName = useMemo(() => {
      const baseClasses = "transition-all duration-200";

      // Handle different label placements
      if (labelPlacement === "top") {
        return cn(
          baseClasses,
          "block mb-1",
          derivedStates.finalError && "text-destructive",
        );
      }

      if (labelPlacement === "left") {
        return cn(
          baseClasses,
          "flex items-center mr-2",
          derivedStates.finalError && "text-destructive",
        );
      }

      if (labelPlacement === "right") {
        return cn(
          baseClasses,
          "flex items-center ml-2",
          derivedStates.finalError && "text-destructive",
        );
      }

      if (labelPlacement === "inside") {
        return cn(
          baseClasses,
          "absolute left-3 pointer-events-none transform-gpu text-muted-foreground",
          derivedStates.shouldShrinkLabel
            ? "text-[10px] top-0.5 -translate-y-0"
            : "top-2.5 text-xs translate-y-0",
        );
      }

      if (labelPlacement === "overTheLine") {
        return cn(
          baseClasses,
          "absolute left-2 pointer-events-none transform-gpu z-20 text-muted-foreground text-xs",
          "top-0 -translate-y-1/2",
          "bg-background px-1",
        );
      }

      // Default fallback
      return cn(baseClasses, derivedStates.finalError && "text-destructive");
    }, [
      labelPlacement,
      derivedStates.shouldShrinkLabel,
      derivedStates.finalError,
    ]);

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setHasValue(newValue.trim().length > 0);

        // Perform validation
        const validation = validateInput(newValue);
        setValidationError(
          validation.isValid ? "" : validation.errorMessage || "",
        );
        onValidation?.(validation.isValid, validation.errorMessage);

        onChange?.(e);
      },
      [onChange, validateInput, onValidation],
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // Immediately set focused to true for instant label animation
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);

        // Check if input is empty when blurring
        const isEmpty = e.target.value.trim().length === 0;
        setHasValue(!isEmpty);

        // Perform validation on blur
        const validation = validateInput(e.target.value);
        setValidationError(
          validation.isValid ? "" : validation.errorMessage || "",
        );
        onValidation?.(validation.isValid, validation.errorMessage);

        onBlur?.(e);
      },
      [onBlur, validateInput, onValidation],
    );

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLInputElement>) => {
        // Immediately set focused to true for instant label animation
        setFocused(true);
        // Focus the input programmatically to ensure consistency
        e.currentTarget.focus();

        onClick?.(e);
      },
      [onClick],
    );

    const handleTogglePassword = useCallback(() => {
      setShowPassword((prev) => !prev);
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTogglePassword();
        }
      },
      [handleTogglePassword],
    );

    const handleKeyDownOnInput = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // When Tab is pressed, immediately set focused to true for instant label animation
        if (e.key === "Tab") {
          setFocused(true);
        }
      },
      [],
    );

    const handleKeyUpOnInput = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Additional handling for Tab key on keyup to ensure focus state
        if (e.key === "Tab") {
          setFocused(true);
        }
      },
      [],
    );

    const renderPasswordToggle = useCallback(() => {
      if (!derivedStates.shouldShowPasswordToggle) return null;

      return (
        <button
          type="button"
          onClick={handleTogglePassword}
          className="cursor-pointer hover:opacity-70 transition-opacity"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      );
    }, [
      derivedStates.shouldShowPasswordToggle,
      showPassword,
      handleTogglePassword,
      handleKeyDown,
    ]);

    const renderInput = useCallback(
      () => (
        <div className="relative flex items-center w-full">
          {startContent && (
            <div className="absolute left-3 flex items-center pointer-events-none z-10">
              {startContent}
            </div>
          )}
          <Input
            id={inputId}
            ref={handleRef}
            placeholder={
              labelPlacement === "inside" && label ? "" : placeholder
            }
            className={inputClassName}
            disabled={disabled}
            required={inputIsRequired}
            minLength={minLength}
            maxLength={maxLength}
            pattern={pattern}
            type={derivedStates.actualType}
            value={value}
            defaultValue={defaultValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleInputChange}
            onClick={handleClick}
            onKeyDown={handleKeyDownOnInput}
            onKeyUp={handleKeyUpOnInput}
            aria-invalid={!!derivedStates.finalError}
            aria-describedby={
              derivedStates.finalError ? `${inputId}-error` : undefined
            }
            {...props}
          />
          <div className="absolute right-3 flex items-center z-10">
            {derivedStates.shouldShowPasswordToggle && renderPasswordToggle()}
            {!derivedStates.shouldShowPasswordToggle && endContent}
          </div>
        </div>
      ),
      [
        startContent,
        inputId,
        handleRef,
        labelPlacement,
        label,
        placeholder,
        inputClassName,
        disabled,
        inputIsRequired,
        minLength,
        maxLength,
        pattern,
        derivedStates.actualType,
        value,
        defaultValue,
        handleFocus,
        handleBlur,
        handleInputChange,
        handleClick,
        handleKeyDownOnInput,
        handleKeyUpOnInput,
        derivedStates.finalError,
        derivedStates.shouldShowPasswordToggle,
        renderPasswordToggle,
        endContent,
        props,
      ],
    );

    const renderLabel = useCallback(() => {
      if (!label) return null;

      return (
        <Label htmlFor={inputId} className={labelClassName}>
          {label}
          {inputIsRequired && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </Label>
      );
    }, [label, inputId, labelClassName, inputIsRequired]);

    const renderError = useCallback(() => {
      if (!derivedStates.finalError) return null;

      return (
        <div
          id={`${inputId}-error`}
          className="text-destructive text-xs mt-1"
          role="alert"
          aria-live="polite"
        >
          {derivedStates.finalError}
        </div>
      );
    }, [derivedStates.finalError, inputId]);

    // Memoize the entire component layouts to prevent unnecessary re-renders
    const layoutComponents = useMemo(() => {
      const input = renderInput();
      const label = renderLabel();
      const error = renderError();

      return { input, label, error };
    }, [renderInput, renderLabel, renderError]);

    if (labelPlacement === "inside") {
      return (
        <div className="relative w-full">
          <div className="relative">
            {layoutComponents.input}
            {layoutComponents.label}
          </div>
          {layoutComponents.error}
        </div>
      );
    }

    if (labelPlacement === "left") {
      return (
        <div className="w-full">
          <div className="flex items-center">
            {layoutComponents.label}
            {layoutComponents.input}
          </div>
          {layoutComponents.error}
        </div>
      );
    }

    if (labelPlacement === "right") {
      return (
        <div className="w-full">
          <div className="flex items-center">
            {layoutComponents.input}
            {layoutComponents.label}
          </div>
          {layoutComponents.error}
        </div>
      );
    }

    if (labelPlacement === "overTheLine") {
      return (
        <div className="relative w-full">
          <div className="relative">
            {layoutComponents.input}
            {layoutComponents.label}
          </div>
          {layoutComponents.error}
        </div>
      );
    }

    // Default to top
    return (
      <div className="w-full">
        {layoutComponents.label}
        {layoutComponents.input}
        {layoutComponents.error}
      </div>
    );
  },
);

InputCustom.displayName = "InputCustom";

export default InputCustom;
