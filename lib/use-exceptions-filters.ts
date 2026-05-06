"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { ExceptionsFilters } from "@/lib/exceptions-data";

/**
 * URL-synced filter state for the exceptions page.
 *
 * Reads filter values from the URL on every render (no internal state).
 * Filter updates dispatch via router.push, which updates the URL and
 * triggers a re-render with the new filter values. Empty values are
 * omitted from the URL.
 */
export function useExceptionsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: ExceptionsFilters = useMemo(() => {
    const dateFrom = searchParams.get("from") ?? undefined;
    const dateTo = searchParams.get("to") ?? undefined;
    const severitiesParam = searchParams.get("severity") ?? "";
    const severities = severitiesParam ? severitiesParam.split(",") : undefined;
    const storeIdParam = searchParams.get("store") ?? "";
    const storeIdParsed = storeIdParam ? parseInt(storeIdParam, 10) : undefined;
    const ruleId = searchParams.get("rule") ?? undefined;

    return {
      dateFrom,
      dateTo,
      severities: severities && severities.length > 0 ? severities : undefined,
      storeId: storeIdParsed !== undefined && !isNaN(storeIdParsed) ? storeIdParsed : undefined,
      ruleId,
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (updates: Partial<ExceptionsFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      const apply = (key: string, value: string | undefined) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      };

      if ("dateFrom" in updates) apply("from", updates.dateFrom);
      if ("dateTo" in updates) apply("to", updates.dateTo);
      if ("severities" in updates) {
        apply(
          "severity",
          updates.severities && updates.severities.length > 0 ? updates.severities.join(",") : undefined,
        );
      }
      if ("storeId" in updates) {
        apply("store", updates.storeId !== undefined ? String(updates.storeId) : undefined);
      }
      if ("ruleId" in updates) apply("rule", updates.ruleId);

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters =
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    (filters.severities !== undefined && filters.severities.length > 0) ||
    filters.storeId !== undefined ||
    filters.ruleId !== undefined;

  return { filters, updateFilters, clearFilters, hasActiveFilters };
}
