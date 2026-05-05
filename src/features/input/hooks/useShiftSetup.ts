/**
 * useShiftSetup — orchestration hook for the Setup Awal Production Run page.
 *
 * Owns all local UI state, derived state, effects, validation, and the
 * handleStartShift mutation.  The page component is left as a thin render layer.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveShiftRun, useCreateShiftRun } from "@/hooks/useShiftRun";
import {
  type ShiftTab,
  type SetupStep,
  type SampleCheck,
  type POSAssignment,
  type Step1State,
  STEP1_DEFAULT,
} from "../types";
import {
  useLines,
  useProducts,
  useAllShifts,
  useLeaderGroups,
  useLineProducts,
  useLineOperators,
  useLineGroups,
  useGroupPOS,
  useLineCheckItems,
} from "./useShiftSetupData";

// ─── Internal helpers ─────────────────────────────────────────────────────────

const toMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

const combineDateTime = (dateStr: string, timeStr: string, refTimeStr?: string): string => {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (refTimeStr && toMins(timeStr) < toMins(refTimeStr)) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

const emptyChecks = (): SampleCheck[] =>
  Array.from({ length: 5 }, (_, i) => ({ no: i + 1, status: "" as const, measurement: "", note: "" }));

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useShiftSetup() {
  const { user } = useAuth();

  // ── Draft persistence key ───────────────────────────────────────────────────
  const draftKey = user?.id ? `shift_draft_v1_${user.id}` : null;
  const [draftRestored, setDraftRestored] = useState(false);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]             = useState<ShiftTab>("setup");
  const [setupStep, setSetupStep]             = useState<SetupStep>(1);
  const [step1, setStep1]                     = useState<Step1State>(STEP1_DEFAULT);
  const [step1Errors, setStep1Errors]         = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems]       = useState<string[]>([]);
  const [posOpAssignments, setPosOpAssignments] = useState<Record<string, POSAssignment>>({});
  const [firstChecks, setFirstChecks]         = useState<SampleCheck[]>(emptyChecks());
  const [lastChecks, setLastChecks]           = useState<SampleCheck[]>(emptyChecks());
  const [firstCheckDone, setFirstCheckDone]   = useState(false);
  const [lastCheckDone, setLastCheckDone]     = useState(false);
  const [setupNotes, setSetupNotes]           = useState("");
  const [setupBusy, setSetupBusy]             = useState(false);

  // ── Server State ────────────────────────────────────────────────────────────
  const { data: activeRun, isLoading: runLoading } = useActiveShiftRun();

  const { data: lines = [],        isLoading: linesLoading       } = useLines();
  const { data: products = [],     isLoading: productsLoading    } = useProducts();
  const { data: allShifts = [],    isLoading: shiftsLoading      } = useAllShifts();
  const { data: leaderGroups = []                                 } = useLeaderGroups(user?.id);
  const { data: lineProducts = [], isLoading: lineProductsLoading } = useLineProducts(step1.lineId);

  const activeLineId  = step1.lineId  || activeRun?.line_id  || "";
  const activeGroupId = step1.groupId || "";

  const { data: lineOperators = []                               } = useLineOperators(activeLineId);
  const { data: lineGroups = [],    isLoading: groupsLoading     } = useLineGroups(activeLineId);
  const {
    data: groupPosResult = { groupId: null, groupCode: "", posData: [] },
    isLoading: posLoading,
  } = useGroupPOS(activeGroupId);

  const linePOS           = groupPosResult.posData;
  const resolvedGroupId   = step1.groupId || null;
  const resolvedGroupCode = lineGroups.find((g: any) => g.id === step1.groupId)?.code ?? "";

  const checkGroups = useLineCheckItems(step1.lineId);
  const totalChecks = checkGroups.reduce((sum, g) => sum + g.items.length, 0);

  // ── Derived state ────────────────────────────────────────────────────────────
  const leaderLineIds = useMemo(
    () => [
      ...new Set(
        leaderGroups
          .map((lg: any) => lg.groups?.line_id)
          .filter((id: any): id is string => !!id),
      ),
    ],
    [leaderGroups],
  );

  const visibleLines = useMemo(
    () => (leaderLineIds.length > 0 ? lines.filter(l => leaderLineIds.includes(l.id)) : lines),
    [lines, leaderLineIds],
  );

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Auto-select line when leader has exactly one assigned line
  useEffect(() => {
    if (step1.lineId || visibleLines.length !== 1) return;
    setStep1(f => ({ ...f, lineId: visibleLines[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLines]);

  // Auto-select leader's group when line changes
  useEffect(() => {
    if (!step1.lineId || leaderGroups.length === 0) return;
    const match = leaderGroups.find((lg: any) => lg.groups?.line_id === step1.lineId);
    if (match) setStep1(f => ({ ...f, groupId: match.group_id }));
  }, [step1.lineId, leaderGroups]);

  // Auto-fill plan times from shift
  useEffect(() => {
    if (!step1.shiftId || allShifts.length === 0) return;
    const sel = allShifts.find(s => s.id === step1.shiftId);
    if (!sel) return;
    setStep1(f => ({
      ...f,
      planStartTime:   sel.start_time.slice(0, 5),
      planFinishTime:  sel.end_time.slice(0, 5),
      actualStartTime: sel.start_time.slice(0, 5),
    }));
  }, [step1.shiftId, allShifts]);

  // Restore draft from localStorage once run-loading settles
  useEffect(() => {
    if (runLoading || draftRestored || !draftKey) return;
    if (activeRun) { setDraftRestored(true); return; }
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) { setDraftRestored(true); return; }
      const draft = JSON.parse(raw) as Record<string, unknown>;
      if (draft.savedAt && Date.now() - new Date(draft.savedAt as string).getTime() > 86_400_000) {
        localStorage.removeItem(draftKey);
        setDraftRestored(true);
        return;
      }
      if (draft.step1)              setStep1(draft.step1 as Step1State);
      if (draft.setupStep)          setSetupStep(draft.setupStep as SetupStep);
      if (draft.setupNotes != null) setSetupNotes(draft.setupNotes as string);
      if (draft.checkedItems)       setCheckedItems(draft.checkedItems as string[]);
      if (draft.firstChecks)        setFirstChecks(draft.firstChecks as SampleCheck[]);
      if (draft.lastChecks)         setLastChecks(draft.lastChecks as SampleCheck[]);
      if (draft.firstCheckDone != null) setFirstCheckDone(draft.firstCheckDone as boolean);
      if (draft.lastCheckDone  != null) setLastCheckDone(draft.lastCheckDone as boolean);
      if (draft.posOpAssignments)   setPosOpAssignments(draft.posOpAssignments as Record<string, POSAssignment>);
      toast.info("Draft form dipulihkan dari sesi sebelumnya.", { duration: 4000 });
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      setDraftRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runLoading, activeRun, draftKey]);

  // Persist draft on every relevant state change
  useEffect(() => {
    if (!draftKey || !draftRestored || activeRun) return;
    const draft = {
      step1, setupStep, setupNotes, checkedItems,
      firstChecks, lastChecks, firstCheckDone, lastCheckDone,
      posOpAssignments, savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    draftKey, draftRestored, activeRun,
    step1, setupStep, setupNotes, checkedItems,
    firstChecks, lastChecks, firstCheckDone, lastCheckDone,
    posOpAssignments,
  ]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createRun = useCreateShiftRun();

  // ── Validation ───────────────────────────────────────────────────────────────
  const clearE = (k: string) =>
    setStep1Errors(prev => { const n = { ...prev }; delete n[k]; return n; });

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!step1.workOrderNo.trim()) e.workOrderNo = "No. Work Order wajib diisi";
    if (!step1.shiftId)            e.shiftId     = "Pilih shift terlebih dahulu";
    if (!step1.prodDate)           e.prodDate    = "Tanggal produksi wajib diisi";
    if (!step1.lineId)             e.lineId      = "Pilih lini produksi";
    if (!step1.groupId)            e.groupId     = "Pilih group / regu";
    if (!step1.productId)          e.productId   = "Pilih produk yang akan diproduksi";
    if (step1.targetQty <= 0)      e.targetQty   = "Rencana Qty harus lebih dari 0";
    setStep1Errors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Lengkapi semua field wajib di Step 1.", { duration: 3000 });
    }
    return Object.keys(e).length === 0;
  }

  // ── handleStartShift ─────────────────────────────────────────────────────────
  const handleStartShift = async () => {
    if (!validateStep1()) return;
    setSetupBusy(true);
    try {
      const sel = allShifts.find((s: any) => s.id === step1.shiftId);
      const planStartStr = step1.planStartTime || (sel?.start_time?.slice(0, 5) ?? "");

      const shiftMins = sel
        ? (() => { const d = toMins(sel.end_time) - toMins(sel.start_time); return d > 0 ? d : d + 1440; })()
        : 480;
      const breakMins      = (sel as any)?.break_minutes ?? 60;
      const productiveMins = Math.max(60, shiftMins - breakMins);
      const hourlyTarget   = Math.round(step1.targetQty / (productiveMins / 60));

      const planStartAt  = planStartStr
        ? new Date(`${step1.prodDate}T${planStartStr}:00`).toISOString()
        : undefined;
      const planFinishAt = step1.planFinishTime
        ? combineDateTime(step1.prodDate, step1.planFinishTime, planStartStr || undefined)
        : undefined;
      const startedAt = step1.actualStartTime
        ? combineDateTime(step1.prodDate, step1.actualStartTime, planStartStr || undefined)
        : new Date().toISOString();

      await createRun.mutateAsync({
        line_id:             step1.lineId,
        shift_id:            step1.shiftId,
        group_id:            step1.groupId,
        product_id:          step1.productId,
        work_order_no:       step1.workOrderNo.trim(),
        target_quantity:     step1.targetQty,
        hourly_target:       hourlyTarget,
        leader_user_id:      user?.id || "",
        operator_ids:        [],
        checklist_completed: checkedItems.length === totalChecks,
        notes:               setupNotes.trim() || "",
        actual_started_at:   startedAt,
        plan_start_at:       planStartAt,
        plan_finish_at:      planFinishAt,
      });

      if (draftKey) localStorage.removeItem(draftKey);
      setSetupStep(1);
      setActiveTab("first_check");
      toast.success(`Shift run dimulai — WO ${step1.workOrderNo}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai shift run.");
    } finally {
      setSetupBusy(false);
    }
  };

  // ── Exposed API ──────────────────────────────────────────────────────────────
  return {
    // auth / run
    user,
    activeRun,
    runLoading,

    // tabs / steps
    activeTab,  setActiveTab,
    setupStep,  setSetupStep,

    // step 1 form
    step1,       setStep1,
    step1Errors, clearE,
    validateStep1,

    // step 2
    posOpAssignments, setPosOpAssignments,
    linePOS,          posLoading,
    resolvedGroupId,  resolvedGroupCode,
    lineOperators,

    // step 3
    checkedItems, setCheckedItems,
    checkGroups,  totalChecks,

    // step 4 / notes
    setupNotes, setSetupNotes,
    setupBusy,
    createRun,
    handleStartShift,

    // sample checks (first / last)
    firstChecks,     setFirstChecks,
    lastChecks,      setLastChecks,
    firstCheckDone,  setFirstCheckDone,
    lastCheckDone,   setLastCheckDone,

    // master data
    lines,           linesLoading,
    products,        productsLoading,
    allShifts,       shiftsLoading,
    leaderGroups,
    lineProducts,    lineProductsLoading,
    lineGroups,      groupsLoading,
    visibleLines,
  };
}
