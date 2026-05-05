/**
 * TimeInput — Custom 24-jam time picker.
 *
 * Tidak bergantung pada locale browser/OS — selalu HH:MM 24-jam.
 *
 * Fitur:
 *  - Segmen [HH] : [MM] yang bisa diketik langsung
 *  - Klik ikon jam / tombol ▾ → buka dropdown picker visual
 *  - Dropdown: dua kolom scrollable (Jam 00-23, Menit per-5-menit)
 *  - Item aktif di-highlight + auto-scroll ke tengah saat dibuka
 *  - Arrow ↑↓ pada segmen: increment/decrement (wrap 23→0, 59→0)
 *  - Auto-advance: setelah 2 digit jam atau digit pertama ≥ 3
 *  - Backspace/← pada menit kosong: kembali ke segmen jam
 *  - inputMode="numeric" untuk keyboard numerik di mobile/tablet
 *  - API identik dengan <input type="time">: value="HH:MM", onChange(e.target.value)
 */

import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState,
  type InputHTMLAttributes, type KeyboardEvent,
} from "react";
import { ChevronDown, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── helpers ───────────────────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, "0"); }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function parseHM(v: string): [string, string] {
  if (!v) return ["", ""];
  const [h = "", m = ""] = v.split(":");
  return [h, m];
}

const HOURS   = Array.from({ length: 24 }, (_, i) => pad2(i));               // "00"–"23"
const MINUTES = Array.from({ length: 12 }, (_, i) => pad2(i * 5));           // "00","05",…"55"

// ── types ─────────────────────────────────────────────────────────────────────

type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// ── scrollable column ─────────────────────────────────────────────────────────

function TimeColumn({
  items, selected, onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const listRef  = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active item into centre when column mounts / selected changes
  useEffect(() => {
    if (!activeRef.current || !listRef.current) return;
    const list  = listRef.current;
    const item  = activeRef.current;
    const top   = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2;
    list.scrollTo({ top, behavior: "smooth" });
  }, [selected]);

  return (
    <div ref={listRef} className="h-48 overflow-y-auto overscroll-contain scroll-smooth">
      {items.map(v => {
        const isActive = v === selected || (selected && pad2(parseInt(selected, 10)) === v);
        return (
          <button
            key={v}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(v)}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-center text-sm font-mono transition-colors",
              isActive
                ? "bg-primary text-primary-foreground font-bold"
                : "text-foreground hover:bg-muted",
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value = "", onChange, className, disabled, id, name }, ref) => {
    const [initH, initM] = parseHM(String(value));
    const [h, setH] = useState<string>(initH);
    const [m, setM] = useState<string>(initM);
    const [open, setOpen] = useState(false);

    const hRef = useRef<HTMLInputElement>(null);
    const mRef = useRef<HTMLInputElement>(null);

    // Expose the hour input to parent ref so .focus() works from outside
    useImperativeHandle(ref, () => hRef.current as HTMLInputElement);

    const hActive = useRef(false);
    const mActive = useRef(false);

    // Sync from external value (form reset, programmatic change) when not focused
    useEffect(() => {
      const [hv, mv] = parseHM(String(value));
      if (!hActive.current) setH(hv);
      if (!mActive.current) setM(mv);
    }, [value]);

    // ── emit ──────────────────────────────────────────────────────────────────

    function emit(hv: string, mv: string) {
      if (!onChange) return;
      if (hv === "" && mv === "") {
        onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
        return;
      }
      const hn = clamp(parseInt(hv, 10) || 0, 0, 23);
      const mn = clamp(parseInt(mv, 10) || 0, 0, 59);
      onChange({ target: { value: `${pad2(hn)}:${pad2(mn)}` } } as React.ChangeEvent<HTMLInputElement>);
    }

    // ── dropdown select ───────────────────────────────────────────────────────

    function pickHour(hv: string) {
      setH(hv);
      emit(hv, m || "00");
    }

    function pickMinute(mv: string) {
      setM(mv);
      emit(h || "00", mv);
      setOpen(false);
    }

    // ── hour segment ──────────────────────────────────────────────────────────

    function onHourChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
      const n   = parseInt(raw, 10);
      setH(raw);
      if (raw.length === 2 || (!isNaN(n) && n >= 3)) {
        emit(raw, m || "00");
        mRef.current?.focus();
      }
    }

    function onHourKey(e: KeyboardEvent<HTMLInputElement>) {
      const cur = clamp(parseInt(h, 10) || 0, 0, 23);
      if (e.key === "ArrowUp")    { e.preventDefault(); const n = cur < 23 ? cur + 1 : 0;  setH(pad2(n)); emit(String(n), m || "00"); }
      if (e.key === "ArrowDown")  { e.preventDefault(); const n = cur > 0  ? cur - 1 : 23; setH(pad2(n)); emit(String(n), m || "00"); }
      if (e.key === "ArrowRight" || e.key === ":") { e.preventDefault(); mRef.current?.focus(); }
    }

    function onHourBlur() {
      hActive.current = false;
      if (h !== "") { const f = pad2(clamp(parseInt(h, 10) || 0, 0, 23)); setH(f); emit(f, m || "00"); }
      else { setM(""); emit("", ""); }
    }

    // ── minute segment ────────────────────────────────────────────────────────

    function onMinChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
      const n   = parseInt(raw, 10);
      setM(raw);
      if (raw.length === 2 || (!isNaN(n) && n >= 6)) emit(h || "00", raw);
    }

    function onMinKey(e: KeyboardEvent<HTMLInputElement>) {
      const cur = clamp(parseInt(m, 10) || 0, 0, 59);
      if (e.key === "ArrowUp")   { e.preventDefault(); const n = cur < 59 ? cur + 1 : 0;  setM(pad2(n)); emit(h || "00", String(n)); }
      if (e.key === "ArrowDown") { e.preventDefault(); const n = cur > 0  ? cur - 1 : 59; setM(pad2(n)); emit(h || "00", String(n)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); hRef.current?.focus(); }
      if (e.key === "Backspace" && m === "") { e.preventDefault(); hRef.current?.focus(); }
    }

    function onMinBlur() {
      mActive.current = false;
      if (m !== "") { const f = pad2(clamp(parseInt(m, 10) || 0, 0, 59)); setM(f); emit(h || "00", f); }
      else if (h !== "") emit(h, "00");
    }

    // ── shared segment style ──────────────────────────────────────────────────

    const segCls =
      "w-7 bg-transparent text-center font-mono tabular-nums outline-none " +
      "placeholder:text-muted-foreground/40 caret-primary selection:bg-primary/20";

    // ── render ────────────────────────────────────────────────────────────────

    return (
      <Popover open={open} onOpenChange={setOpen}>
        {/* ── Trigger: the visible input field ── */}
        <PopoverTrigger asChild>
          <div
            role="group"
            aria-label="Pilih waktu"
            className={cn(
              "h-10 w-full inline-flex items-center gap-0.5 rounded-xl border bg-slate-50 px-3 text-sm cursor-text",
              "transition-colors focus-within:border-primary focus-within:bg-white",
              open && "border-primary bg-white",
              disabled && "pointer-events-none opacity-50",
              className,
            )}
            // Clicking the container area (but not the inputs) opens the picker
            onMouseDown={e => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                setOpen(v => !v);
              }
            }}
          >
            <Clock
              className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-pointer"
              aria-hidden
              onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
            />

            {/* Hour */}
            <input
              ref={hRef}
              id={id}
              name={name}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={h}
              placeholder="HH"
              disabled={disabled}
              aria-label="Jam"
              className={segCls}
              onChange={onHourChange}
              onKeyDown={onHourKey}
              onFocus={() => { hActive.current = true; hRef.current?.select(); }}
              onBlur={onHourBlur}
            />

            <span className="select-none font-mono text-muted-foreground" aria-hidden>:</span>

            {/* Minute */}
            <input
              ref={mRef}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={m}
              placeholder="MM"
              disabled={disabled}
              aria-label="Menit"
              className={segCls}
              onChange={onMinChange}
              onKeyDown={onMinKey}
              onFocus={() => { mActive.current = true; mRef.current?.select(); }}
              onBlur={onMinBlur}
            />

            {/* Chevron toggle */}
            <ChevronDown
              className={cn(
                "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform cursor-pointer",
                open && "rotate-180",
              )}
              aria-hidden
              onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
            />
          </div>
        </PopoverTrigger>

        {/* ── Dropdown picker ── */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-52 p-0 rounded-2xl shadow-lg border overflow-hidden"
          // Prevent popover closing when interacting inside
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className="flex divide-x">
            {/* Jam column */}
            <div className="flex-1">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b bg-muted/40">
                Jam
              </div>
              <TimeColumn
                items={HOURS}
                selected={h ? pad2(clamp(parseInt(h, 10) || 0, 0, 23)) : ""}
                onSelect={pickHour}
              />
            </div>

            {/* Menit column */}
            <div className="flex-1">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b bg-muted/40">
                Menit
              </div>
              <TimeColumn
                items={MINUTES}
                selected={m ? pad2(Math.round(parseInt(m, 10) / 5) * 5 % 60) : ""}
                onSelect={pickMinute}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
TimeInput.displayName = "TimeInput";

export { TimeInput };
