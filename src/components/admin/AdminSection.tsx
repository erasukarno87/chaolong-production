import { ReactNode, useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Search, X, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, SlidersHorizontal,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";

// ─── AdminSection ──────────────────────────────────────────────────────────────

interface Props {
  title: string;
  description?: string;
  onAdd?: () => void;
  addLabel?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function AdminSection({ title, description, onAdd, addLabel = "Tambah", rightSlot, children }: Props) {
  return (
    <Card className="p-4 sm:p-5 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-sm sm:text-base font-bold tracking-tight">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex gap-2">
          {rightSlot}
          {onAdd && (
            <Button size="sm" onClick={onAdd} className="gradient-primary text-white border-0">
              <Plus className="h-3.5 w-3.5 mr-1" /> {addLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">{children}</div>
    </Card>
  );
}

// ─── DataTable (simple, kept for backward compat) ─────────────────────────────

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm border-collapse min-w-[640px]">
      <thead>
        <tr className="text-left">
          {headers.map(h => (
            <th key={h} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 py-2 border-b">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

// ─── ColDef ───────────────────────────────────────────────────────────────────

/** Column definition for SortableDataTable */
export interface ColDef {
  /** Header label */
  label: string;
  /** sortIdx applied when user clicks ascending (makes column sortable) */
  sortAsc?: number;
  /** sortIdx applied when user clicks descending; if omitted toggles back to sortAsc */
  sortDesc?: number;
  /** data key used for the per-column filter popover */
  filterKey?: string;
  /** optional extra className for the <th> element */
  className?: string;
}

// ─── SortableDataTable ────────────────────────────────────────────────────────

interface SortableDataTableProps {
  cols: ColDef[];
  sortIdx: number;
  onSort: (i: number) => void;
  colFilters: Record<string, string>;
  onColFilter: (key: string, val: string) => void;
  children: ReactNode;
  minWidth?: string;
}

export function SortableDataTable({
  cols, sortIdx, onSort,
  colFilters, onColFilter,
  children, minWidth = "640px",
}: SortableDataTableProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Close filter popover on outside click
  useEffect(() => {
    if (!openFilter) return;
    function handler(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilter]);

  function handleSort(col: ColDef) {
    if (col.sortAsc === undefined) return;
    const isAsc  = sortIdx === col.sortAsc;
    const isDesc = col.sortDesc !== undefined && sortIdx === col.sortDesc;
    if (!isAsc && !isDesc) {
      onSort(col.sortAsc);
    } else if (isAsc) {
      onSort(col.sortDesc !== undefined ? col.sortDesc : col.sortAsc);
    } else {
      onSort(col.sortAsc);
    }
  }

  return (
    <table
      ref={tableRef}
      className="w-full text-sm border-collapse"
      style={{ minWidth }}
    >
      <thead>
        <tr className="text-left border-b bg-muted/30">
          {cols.map((col, i) => {
            const isAsc      = col.sortAsc !== undefined && sortIdx === col.sortAsc;
            const isDesc     = col.sortDesc !== undefined && sortIdx === col.sortDesc;
            const isSorted   = isAsc || isDesc;
            const hasFilter  = col.filterKey ? !!colFilters[col.filterKey] : false;
            const filterOpen = col.filterKey != null && openFilter === col.filterKey;

            return (
              <th
                key={i}
                className={cn("px-3 py-2.5 align-middle relative", col.className)}
                style={{ overflow: "visible" }}
              >
                <div className="flex items-center gap-1 group/th whitespace-nowrap">

                  {/* Sortable label */}
                  {col.sortAsc !== undefined ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className={cn(
                        "flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold transition-colors select-none",
                        isSorted ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {col.label}
                      <span className="inline-flex flex-col -space-y-[3px] ml-0.5 shrink-0">
                        <ChevronUp   className={cn("h-[9px] w-[9px]", isAsc  ? "text-primary" : "text-muted-foreground/30")} />
                        <ChevronDown className={cn("h-[9px] w-[9px]", isDesc ? "text-primary" : "text-muted-foreground/30")} />
                      </span>
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold select-none">
                      {col.label}
                    </span>
                  )}

                  {/* Filter icon — visible on hover or when active */}
                  {col.filterKey && (
                    <button
                      type="button"
                      onClick={() => setOpenFilter(filterOpen ? null : col.filterKey!)}
                      title={hasFilter ? `Filter aktif: "${colFilters[col.filterKey]}"` : `Filter ${col.label}`}
                      className={cn(
                        "ml-0.5 p-0.5 rounded transition-all shrink-0",
                        hasFilter
                          ? "text-primary opacity-100"
                          : "text-muted-foreground/40 opacity-0 group-hover/th:opacity-100",
                        filterOpen && "opacity-100 bg-accent",
                      )}
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter popover */}
                {filterOpen && col.filterKey && (
                  <div className="absolute top-full left-0 z-30 mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Filter {col.label}
                    </p>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                      <input
                        autoFocus
                        type="text"
                        value={colFilters[col.filterKey] ?? ""}
                        onChange={e => onColFilter(col.filterKey!, e.target.value)}
                        onKeyDown={e => { if (e.key === "Escape") setOpenFilter(null); }}
                        placeholder="Ketik untuk filter…"
                        className="w-full h-7 pl-7 pr-2 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {colFilters[col.filterKey] && (
                      <button
                        type="button"
                        onClick={() => { onColFilter(col.filterKey!, ""); setOpenFilter(null); }}
                        className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" /> Hapus filter
                      </button>
                    )}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

// ─── RowActions ───────────────────────────────────────────────────────────────

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-1">{children}</div>;
}

// ─── TableToolbar ─────────────────────────────────────────────────────────────

interface TableToolbarProps {
  search: string;
  onSearch: (s: string) => void;
  total: number;
  filteredCount: number;
  placeholder?: string;
  sortOptions?: string[];
  sortIdx?: number;
  onSort?: (i: number) => void;
  /** number of active column filters — shows a badge + clear button when > 0 */
  activeFilterCount?: number;
  onClearColFilters?: () => void;
}

export function TableToolbar({
  search, onSearch,
  total, filteredCount,
  placeholder = "Cari…",
  sortOptions,
  sortIdx = 0,
  onSort,
  activeFilterCount = 0,
  onClearColFilters,
}: TableToolbarProps) {
  const isFiltered = filteredCount < total;
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full h-8 pl-8 pr-8 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {sortOptions && sortOptions.length > 0 && onSort && (
        <select
          value={sortIdx}
          onChange={e => onSort(Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          title="Urutkan data"
        >
          {sortOptions.map((label, i) => (
            <option key={label} value={i}>{label}</option>
          ))}
        </select>
      )}

      {/* Active column filter badge */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClearColFilters}
          className="flex items-center gap-1 h-8 px-2.5 rounded-md border border-primary/50 bg-primary/5 text-xs text-primary hover:bg-primary/10 transition-colors"
        >
          <SlidersHorizontal className="h-3 w-3" />
          {activeFilterCount} filter kolom
          <X className="h-3 w-3 ml-0.5" />
        </button>
      )}

      {/* Count */}
      <span className={cn(
        "text-xs ml-auto shrink-0",
        isFiltered ? "text-primary font-medium" : "text-muted-foreground",
      )}>
        {isFiltered ? `${filteredCount} dari ${total}` : `${total} item`}
      </span>
    </div>
  );
}

// ─── Pager ────────────────────────────────────────────────────────────────────

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface PagerProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  filteredCount: number;
  total?: number;
  pageSize: number;
  onPageSizeChange?: (n: number) => void;
}

export function Pager({
  page, totalPages, onChange,
  filteredCount, total,
  pageSize, onPageSizeChange,
}: PagerProps) {
  if (filteredCount === 0 && !onPageSizeChange) return null;

  const showPaging = totalPages > 1;
  const from = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, filteredCount);

  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap gap-y-1.5">
      {/* Left: row count */}
      <span>
        {filteredCount === 0
          ? "Tidak ada data"
          : showPaging
            ? `${from}–${to} dari ${filteredCount}${total && total !== filteredCount ? ` (total ${total})` : ""}`
            : `${filteredCount}${total && total !== filteredCount ? ` dari ${total}` : ""} item`
        }
      </span>

      {/* Right: rows-per-page + pagination controls */}
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground/70">Baris:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(+e.target.value)}
              className="h-6 rounded border bg-background px-1.5 text-xs focus:outline-none cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        {showPaging && (
          <div className="flex items-center gap-0.5">
            <PageBtn onClick={() => onChange(1)} disabled={page <= 1} title="Halaman pertama">
              <ChevronsLeft className="h-3.5 w-3.5" />
            </PageBtn>
            <PageBtn onClick={() => onChange(page - 1)} disabled={page <= 1} title="Sebelumnya">
              <ChevronLeft className="h-3.5 w-3.5" />
            </PageBtn>
            <span className="px-2.5 font-medium text-foreground text-xs min-w-[52px] text-center">
              {page} / {totalPages}
            </span>
            <PageBtn onClick={() => onChange(page + 1)} disabled={page >= totalPages} title="Berikutnya">
              <ChevronRight className="h-3.5 w-3.5" />
            </PageBtn>
            <PageBtn onClick={() => onChange(totalPages)} disabled={page >= totalPages} title="Halaman terakhir">
              <ChevronsRight className="h-3.5 w-3.5" />
            </PageBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function PageBtn({
  children, disabled, onClick, title,
}: { children: ReactNode; disabled: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="h-7 w-7 rounded-md border flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
