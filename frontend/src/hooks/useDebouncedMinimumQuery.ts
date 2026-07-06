import { useEffect, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MIN_QUERY_LENGTH = 2;

type UseDebouncedMinimumQueryOptions = {
  debounceMs?: number;
  minLength?: number;
};

export function useDebouncedMinimumQuery(
  query: string,
  {
    debounceMs = SEARCH_DEBOUNCE_MS,
    minLength = SEARCH_MIN_QUERY_LENGTH,
  }: UseDebouncedMinimumQueryOptions = {},
) {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < minLength) {
      setDebouncedQuery("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, minLength, query]);

  return debouncedQuery;
}
