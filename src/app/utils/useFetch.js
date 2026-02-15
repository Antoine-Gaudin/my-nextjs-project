"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "./apiFetch";

/**
 * Custom hook for GET requests with loading/error states.
 * @param {string|null} url - The URL to fetch (null to skip)
 * @param {object} [options] - Options
 * @param {any} [options.initialData=null] - Initial data value
 * @param {boolean} [options.immediate=true] - Fetch on mount
 * @returns {{ data, loading, error, refetch }}
 */
export function useFetch(url, { initialData = null, immediate = true } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!!url && immediate);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!url) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const { data: result } = await apiFetch(url, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (err.name !== "AbortError" && !controller.signal.aborted) {
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    return () => abortRef.current?.abort();
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
}
