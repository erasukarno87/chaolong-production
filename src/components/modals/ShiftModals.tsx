/**
 * Barrel re-export — preserves all existing import paths.
 * Original 789-line monolith split into:
 *   ./shift/types.ts              — shared interfaces
 *   ./shift/useShiftModalData.ts  — query hooks
 *   ./shift/ShiftSetupWizardModal.tsx
 *   ./shift/NgEntryModal.tsx
 *   ./shift/DowntimeModal.tsx
 *   ./shift/EosrModal.tsx
 */

export type { ShiftSetupData, NgEntryData, DowntimeData } from "./shift/types";
export { ShiftSetupWizardModal } from "./shift/ShiftSetupWizardModal";
export { NgEntryModal }          from "./shift/NgEntryModal";
export { DowntimeModal }         from "./shift/DowntimeModal";
export { EosrModal }             from "./shift/EosrModal";
