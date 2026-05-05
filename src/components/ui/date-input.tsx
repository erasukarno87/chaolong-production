/**
 * DateInput — Custom date picker dengan tampilan "dd MMMM yyyy" Bahasa Indonesia.
 *
 * Tidak bergantung pada locale browser/OS.
 * Menampilkan calendar popup saat diklik.
 *
 * API identik dengan <input type="date">:
 *   value   : string "YYYY-MM-DD" | ""
 *   onChange: (e: { target: { value: string } }) => void
 */

import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState,
  type InputHTMLAttributes,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── locale data ───────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const DAYS_SHORT = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

// ── helpers ───────────────────────────────────────────────────────────────────

function parseYMD(v: string): { y: number; mo: number; d: number } | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, mo, d] = v.split("-").map(Number);
  return { y, mo: mo - 1, d }; // mo is 0-indexed
}

function toYMD(y: number, mo: number, d: number): string {
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(v: string): string {
  const p = parseYMD(v);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")} ${MONTHS_ID[p.mo]} ${p.y}`;
}

/** Build a 6-row × 7-col calendar grid (null = padding cell). */
function buildGrid(year: number, month: number): (number | null)[][] {
  const firstDow    = new Date(year, month, 1).getDay();     // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) =>
    cells.slice(r * 7, r * 7 + 7),
  );
}

function isSameDay(y: number, mo: number, d: number, v: string): boolean {
  const p = parseYMD(v);
  return !!p && p.y === y && p.mo === mo && p.d === d;
}

function isToday(y: number, mo: number, d: number): boolean {
  const t = new Date();
  return t.getFullYear() === y && t.getMonth() === mo && t.getDate() === d;
}

// ── types ─────────────────────────────────────────────────────────────────────

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// ── component ─────────────────────────────────────────────────────────────────

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value = "", onChange, className, disabled, id, name, placeholder }, ref) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const hiddenRef  = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => hiddenRef.current as HTMLInputElement);

    const today = new Date();
    const parsed = parseYMD(String(value));

    const [open,    setOpen]    = useState(false);
    const [viewY,   setViewY]   = useState(parsed?.y  ?? today.getFullYear());
    const [viewMo,  setViewMo]  = useState(parsed?.mo ?? today.getMonth());

    // When popover opens, jump to the selected date's month (or today)
    useEffect(() => {
      if (open) {
        const p = parseYMD(String(value));
        setViewY( p?.y  ?? today.getFullYear());
        setViewMo(p?.mo ?? today.getMonth());
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function emit(v: string) {
      onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
    }

    function prevMonth() {
      if (viewMo === 0) { setViewY(y => y - 1); setViewMo(11); }
      else setViewMo(m => m - 1);
    }
    function nextMonth() {
      if (viewMo === 11) { setViewY(y => y + 1); setViewMo(0); }
      else setViewMo(m => m + 1);
    }
    function prevYear() { setViewY(y => y - 1); }
    function nextYear() { setViewY(y => y + 1); }

    function selectDay(d: number) {
      emit(toYMD(viewY, viewMo, d));
      setOpen(false);
    }
    function clearValue(e: React.MouseEvent) {
      e.stopPropagation();
      emit("");
    }

    const grid        = buildGrid(viewY, viewMo);
    const displayText = formatDisplay(String(value));

    return (
      <>
        {/* Hidden native input keeps value accessible for form libraries */}
        <input
          ref={hiddenRef}
          type="hidden"
          id={id}
          name={name}
          value={String(value)}
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled}
              className={cn(
                "h-10 w-full inline-flex items-center gap-2 rounded-xl border bg-slate-50 px-3 text-sm text-left",
                "transition-colors focus:outline-none focus:border-primary focus:bg-white",
                open && "border-primary bg-white",
                disabled && "pointer-events-none opacity-50",
                className,
              )}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className={cn("flex-1 font-medium", !displayText && "text-muted-foreground/50 font-normal")}>
                {displayText || (placeholder ?? "Pilih tanggal")}
              </span>
              {displayText && (
                <X
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Hapus tanggal"
                  onMouseDown={clearValue}
                />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-72 p-0 rounded-2xl shadow-lg border overflow-hidden"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            {/* ── Header: month + year navigation ── */}
            <div className="flex items-center gap-1 px-3 py-2.5 border-b bg-muted/30">
              <button
                type="button"
                onClick={prevYear}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                title="Tahun sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <ChevronLeft className="h-3.5 w-3.5 -ml-2.5" />
              </button>
              <button
                type="button"
                onClick={prevMonth}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div className="flex-1 text-center text-sm font-bold select-none">
                {MONTHS_ID[viewMo]} {viewY}
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                title="Bulan berikutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={nextYear}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                title="Tahun berikutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                <ChevronRight className="h-3.5 w-3.5 -ml-2.5" />
              </button>
            </div>

            {/* ── Day-of-week header ── */}
            <div className="grid grid-cols-7 px-2 pt-2 pb-1">
              {DAYS_SHORT.map(d => (
                <div
                  key={d}
                  className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* ── Calendar grid ── */}
            <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
              {grid.flat().map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const selected = isSameDay(viewY, viewMo, day, String(value));
                const todayFlag = isToday(viewY, viewMo, day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      "h-8 w-full rounded-lg text-sm font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : todayFlag
                          ? "border border-primary/40 text-primary font-bold hover:bg-primary/10"
                          : "text-foreground hover:bg-muted",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* ── Footer: Hari ini shortcut ── */}
            <div className="border-t px-3 py-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  emit(toYMD(t.getFullYear(), t.getMonth(), t.getDate()));
                  setOpen(false);
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Hari ini
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
