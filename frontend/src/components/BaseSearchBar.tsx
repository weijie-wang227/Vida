import { useEffect, type ReactNode, type Ref } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedMinimumQuery } from "../hooks/useDebouncedMinimumQuery";

type BaseSearchBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onDebouncedQueryChange?: (query: string) => void;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
  iconSize?: number;
  clearable?: boolean;
  clearAriaLabel?: string;
  debounceMs?: number;
  minLength?: number;
  endAdornment?: ReactNode;
  onClear?: () => void;
};

export function BaseSearchBar({
  value,
  onValueChange,
  onDebouncedQueryChange,
  placeholder,
  ariaLabel = placeholder,
  className = "flex h-10 items-center gap-2 rounded-xl bg-secondary px-3",
  inputClassName = "min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
  inputRef,
  iconSize = 18,
  clearable = false,
  clearAriaLabel = "Clear search",
  debounceMs,
  minLength,
  endAdornment,
  onClear,
}: BaseSearchBarProps) {
  const debouncedQuery = useDebouncedMinimumQuery(value, {
    debounceMs,
    minLength,
  });

  useEffect(() => {
    onDebouncedQueryChange?.(debouncedQuery);
  }, [debouncedQuery, onDebouncedQueryChange]);

  const handleClear = () => {
    onValueChange("");
    onDebouncedQueryChange?.("");
    onClear?.();
  };

  return (
    <div className={className}>
      <Search
        size={iconSize}
        className="flex-shrink-0 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={inputClassName}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {endAdornment}
      {clearable && value && (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-background/60"
          aria-label={clearAriaLabel}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
