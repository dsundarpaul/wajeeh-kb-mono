"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSearch(delay = 300) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, delay]);

  const reset = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return { query, debouncedQuery, setQuery, reset };
}
