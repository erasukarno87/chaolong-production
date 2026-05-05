/** Escape a single CSV cell (wraps in quotes if needed) */
function csvEscape(value: string): string {
  if (/[,"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Build and trigger download of a 2-row CSV (header + 1 sample).
 * Adds BOM so Excel opens UTF-8 correctly.
 */
export function downloadTemplate(
  filename: string,
  headers: string[],
  sample: (string | number | boolean)[],
): void {
  const content =
    "﻿" +
    headers.map(csvEscape).join(",") +
    "\n" +
    sample.map(v => csvEscape(String(v))).join(",") +
    "\n";
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV text into an array of row objects keyed by header names.
 * Handles quoted fields and CRLF line endings.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        result.push(cur.trim()); cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

/** "true" / "1" / "ya" → true, empty → default, else false */
export function toBool(s: string | undefined, def = true): boolean {
  if (s === undefined || s === "") return def;
  return ["true", "1", "yes", "ya", "aktif"].includes(s.toLowerCase().trim());
}

/** Parse integer, null if empty or NaN */
export function toInt(s: string | undefined): number | null {
  if (!s?.trim()) return null;
  const n = parseInt(s.trim(), 10);
  return isNaN(n) ? null : n;
}

/** Parse float, null if empty or NaN */
export function toFloat(s: string | undefined): number | null {
  if (!s?.trim()) return null;
  const n = parseFloat(s.trim());
  return isNaN(n) ? null : n;
}
