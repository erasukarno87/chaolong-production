/**
 * Definisi level skill operator — dipakai di seluruh aplikasi.
 *
 * 0 = Belum Mampu
 * 1 = Belajar (Dengan pengawasan ketat)
 * 2 = Mampu (Mandiri)          ← default minimum requirement
 * 3 = Terampil (Analitikal)
 * 4 = Expert (Bisa Melatih)
 */

export const SKILL_LEVEL_MIN = 0;
export const SKILL_LEVEL_MAX = 4;
export const SKILL_LEVEL_DEFAULT_REQ = 2; // default min_level pada skill requirement

export const SKILL_LEVEL_LABEL: Record<number, string> = {
  0: "Belum Mampu",
  1: "Belajar",
  2: "Mampu",
  3: "Terampil",
  4: "Expert",
};

export const SKILL_LEVEL_LABEL_FULL: Record<number, string> = {
  0: "0 — Belum Mampu",
  1: "1 — Belajar (Dengan pengawasan ketat)",
  2: "2 — Mampu (Mandiri)",
  3: "3 — Terampil (Analitikal)",
  4: "4 — Expert (Bisa Melatih)",
};

/** Chip CSS class per level */
export const SKILL_LEVEL_CHIP: Record<number, string> = {
  0: "chip",                // abu / default
  1: "chip chip-warning",  // kuning — masih belajar
  2: "chip chip-info",     // biru — sudah mandiri
  3: "chip chip-success",  // hijau — terampil
  4: "chip chip-success",  // hijau terang — expert
};

/** Warna teks/badge ringkas untuk tampilan monitoring */
export const SKILL_LEVEL_COLOR: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-yellow-600",
  2: "text-blue-600",
  3: "text-green-600",
  4: "text-emerald-600",
};
