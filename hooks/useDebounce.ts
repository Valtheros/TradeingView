"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: TArgs) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);
}
