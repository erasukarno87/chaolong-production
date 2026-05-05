/**
 * Traceability — Audit & Lacak per Work Order
 * Search by WO → full production data: summary, hourly output,
 * NG detail, downtime log, and 4M analysis.
 */
import { useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InlineLoading, EmptyState } from "@/components/ui/states";
import { useSearchWO } from "@/features/traceability/hooks";
import { RunCard } from "@/features/traceability/RunCard";

export default function Traceability() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const { data: runs = [], isLoading, isFetching } = useSearchWO(query);

  const handleSearch = () => {
    if (input.trim().length < 2) return;
    setQuery(input.trim());
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Traceability Work Order
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lacak dan audit data produksi berdasarkan Nomor Work Order.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 max-w-lg">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Masukkan No. Work Order… (min 2 karakter)"
          className="font-mono"
        />
        <Button onClick={handleSearch} disabled={input.trim().length < 2 || isFetching}>
          {isFetching ? "Mencari…" : "Cari"}
        </Button>
      </div>

      {/* States */}
      {!query && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Belum ada pencarian"
          description="Masukkan nomor WO untuk melihat data produksi lengkap."
        />
      )}

      {query && isLoading && (
        <InlineLoading label="Mencari data WO…" className="py-6 justify-center" />
      )}

      {query && !isLoading && runs.length === 0 && (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12" />}
          title="Work Order tidak ditemukan"
          description={`Tidak ada shift run dengan WO mengandung "${query}".`}
        />
      )}

      {/* Results */}
      {runs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Ditemukan <strong>{runs.length}</strong> shift run untuk WO mengandung{" "}
            <span className="font-mono font-bold">"{query}"</span>
          </p>
          {runs.map(run => <RunCard key={run.id} run={run} />)}
        </div>
      )}
    </div>
  );
}
