import { useState } from "react";
import { ChevronDown, ChevronUp, Factory, Package, Clock, CheckCircle2 } from "lucide-react";
import { DetailPanel } from "./DetailPanel";
import { fmtDate } from "./helpers.tsx";
import type { TraceRun } from "./types";
import { STATUS_CHIP, STATUS_LABEL } from "./types";

export function RunCard({ run }: { run: TraceRun }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl border bg-white shadow-sm transition-shadow ${expanded ? "shadow-md" : "hover:shadow-sm"}`}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-mono text-sm font-bold text-primary">{run.work_order ?? "—"}</span>
              <span className={STATUS_CHIP[run.status] ?? "chip"}>{STATUS_LABEL[run.status] ?? run.status}</span>
              {run.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Factory className="h-3.5 w-3.5" />{run.lines?.code ?? "—"}</span>
              <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{run.products?.code ?? "—"} — {run.products?.name ?? "—"}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {run.shifts?.name ?? "—"} ({run.shifts?.start_time ?? ""}–{run.shifts?.end_time ?? ""})
              </span>
              {run.started_at && <span className="font-medium text-foreground">{fmtDate(run.started_at)}</span>}
            </div>
          </div>
          <div className="shrink-0 mt-1 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <DetailPanel run={run} />
        </div>
      )}
    </div>
  );
}
