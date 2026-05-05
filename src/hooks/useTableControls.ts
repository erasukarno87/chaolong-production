import { useState, useMemo } from "react";

export interface SortOption<T> {
  label: string;
  fn: (a: T, b: T) => number;
}

export const PAGE_SIZE = 20;

export function useTableControls<T>(
  data: T[],
  searchFields: Array<keyof T | ((row: T) => string)>,
  sortOptions: SortOption<T>[],
  initialPageSize = PAGE_SIZE,
) {
  const [search, setSearchRaw] = useState("");
  const [sortIdx, setSortIdxRaw] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);
  const [colFilters, setColFiltersRaw] = useState<Record<string, string>>({});

  const setSearch = (s: string) => { setSearchRaw(s); setPage(1); };
  const setSortIdx = (i: number) => { setSortIdxRaw(i); setPage(1); };
  const setPageSize = (n: number) => { setPageSizeRaw(n); setPage(1); };

  const setColFilter = (key: string, val: string) => {
    setColFiltersRaw(prev => {
      if (!val.trim()) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: val };
    });
    setPage(1);
  };

  const clearColFilters = () => { setColFiltersRaw({}); setPage(1); };

  // searchFields and sortOptions are module-level constants — stable references
  const filtered = useMemo(() => {
    let result = [...data];

    // Global search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(row =>
        searchFields.some(field => {
          const val = typeof field === "function"
            ? field(row)
            : (row as Record<string, unknown>)[field as string];
          return String(val ?? "").toLowerCase().includes(q);
        })
      );
    }

    // Column filters
    const activeFilters = Object.entries(colFilters);
    if (activeFilters.length > 0) {
      result = result.filter(row =>
        activeFilters.every(([key, val]) => {
          const v = (row as Record<string, unknown>)[key];
          return String(v ?? "").toLowerCase().includes(val.toLowerCase());
        })
      );
    }

    // Sort
    const sf = sortOptions[sortIdx]?.fn;
    if (sf) result.sort(sf);

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, sortIdx, colFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search, setSearch,
    sortIdx, setSortIdx,
    page: safePage, setPage,
    totalPages,
    paged,
    filteredCount: filtered.length,
    total: data.length,
    pageSize, setPageSize,
    colFilters, setColFilter, clearColFilters,
    activeFilterCount: Object.keys(colFilters).length,
  };
}
