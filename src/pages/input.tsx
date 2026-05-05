/**
 * Input Laporan — Setup Awal Production Run
 *
 * Thin render layer. All business logic lives in:
 *   features/input/hooks/useShiftSetup.ts  — state + effects + validation + mutation
 *   features/input/hooks/useShiftSetupData.ts — pure Supabase query hooks
 *   features/input/types.ts               — shared types and constants
 */

import type { ReactNode } from "react";
import {
  ArrowRight, Factory, Send, Loader2, Users, XCircle, AlertCircle,
} from "lucide-react";
import { InlineLoading, EmptyState } from "@/components/ui/states";
import { MonitoringErrorBoundary } from "@/components/error/MonitoringErrorBoundary";
import { TimeInput } from "@/components/ui/time-input";
import { DateInput } from "@/components/ui/date-input";
import { useAuth } from "@/contexts/AuthContext";
import { useShiftSetup } from "@/features/input/hooks/useShiftSetup";
import type { SetupStep } from "@/features/input/types";

// ─── Local UI helpers ─────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, badge, children,
}: {
  title: string; icon: any; badge?: string; children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
        {badge && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children, className }: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

export default function ShiftPage() {
  const { effectiveRole } = useAuth();

  if (effectiveRole !== "leader" && effectiveRole !== "super_admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">This page is only accessible to Team Leaders.</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <MonitoringErrorBoundary component="ShiftPage">
      <ShiftPageContent />
    </MonitoringErrorBoundary>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function ShiftPageContent() {
  const setup = useShiftSetup();
  const {
    activeTab, setupStep, setSetupStep,
    step1, setStep1, step1Errors, clearE, validateStep1,
    checkedItems, setCheckedItems, checkGroups, totalChecks,
    setupNotes, setSetupNotes, setupBusy, createRun, handleStartShift,
    linesLoading, productsLoading, shiftsLoading,
    lines, leaderGroups, allShifts, visibleLines,
    lineProducts, lineProductsLoading,
    lineGroups, groupsLoading,
    linePOS, posLoading, resolvedGroupId, resolvedGroupCode,
    posOpAssignments, setPosOpAssignments,
  } = setup;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Setup Awal Production Run</h1>

        {activeTab === "setup" && (
          <div className="grid gap-4 items-start">
            <SectionCard title="Setup Awal Production Run" icon={Factory} badge="Pre-Production">

              {/* ── Step breadcrumbs ── */}
              <div key="breadcrumbs" className="xl:hidden flex items-center gap-2 overflow-x-auto pb-1 mb-5">
                {([
                  [1, "Info Dasar"],
                  [2, "Man Power & WI"],
                  [3, "Auto Check Sheet"],
                  [4, "Konfirmasi"],
                ] as [SetupStep, string][]).map(([step, label]) => (
                  <button
                    key={step}
                    onClick={() => setSetupStep(step)}
                    className={`min-w-[140px] flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                      setupStep === step ? "bg-blue-50 border-blue-200" : "bg-surface hover:bg-slate-50"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full grid place-items-center border font-mono text-sm font-bold ${
                      setupStep === step
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>{step}</div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Step 0{step}</div>
                      <div className={`text-sm font-semibold ${setupStep === step ? "text-primary" : "text-foreground"}`}>{label}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Step 1 · Info Dasar ── */}
              {setupStep === 1 && (
                <div className="space-y-5">
                  {/* Leader group banner */}
                  {leaderGroups.length > 0 && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3 flex-wrap">
                      <div className="h-8 w-8 rounded-xl bg-blue-500 grid place-items-center shrink-0">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Group Anda</div>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {leaderGroups.map((lg: any) => {
                            const lineName = lines.find((l: any) => l.id === lg.groups?.line_id)?.code ?? "—";
                            const isActive = lg.group_id === step1.groupId;
                            return (
                              <span
                                key={lg.id}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                                  isActive
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-blue-700 border-blue-200"
                                }`}
                              >
                                {lg.groups?.code ?? "—"}
                                <span className={`text-[10px] font-normal ${isActive ? "text-blue-100" : "text-blue-400"}`}>
                                  · {lineName}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-500 font-medium shrink-0">
                        Group dipilih otomatis saat lini dipilih
                      </span>
                    </div>
                  )}

                  {(linesLoading || productsLoading || shiftsLoading) ? (
                    <InlineLoading label="Memuat data master…" className="py-6" />
                  ) : (
                    <div className="grid gap-x-4 gap-y-4 md:grid-cols-6">

                      {/* Row 1: No. WO */}
                      <Field label="No. Work Order" required className="md:col-span-6">
                        <input
                          type="text"
                          className={`h-10 w-full rounded-xl border bg-slate-50 px-3 text-sm font-mono outline-none focus:border-primary focus:bg-white ${step1Errors.workOrderNo ? "border-destructive bg-red-50" : ""}`}
                          placeholder="WO-2024-0023"
                          value={step1.workOrderNo}
                          onChange={e => { clearE("workOrderNo"); setStep1(f => ({ ...f, workOrderNo: e.target.value })); }}
                        />
                        {step1Errors.workOrderNo && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.workOrderNo}</p>}
                      </Field>

                      {/* Row 2: Shift · Tanggal Produksi */}
                      <Field label="Shift" required className="md:col-span-3">
                        <div className={`flex gap-2 flex-wrap rounded-xl p-1 -m-1 ${step1Errors.shiftId ? "ring-1 ring-destructive/60 ring-offset-1" : ""}`}>
                          {allShifts.map((s: any) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { clearE("shiftId"); setStep1(f => ({ ...f, shiftId: s.id })); }}
                              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                                step1.shiftId === s.id
                                  ? "border-primary bg-blue-50 text-primary shadow-sm"
                                  : "border-border bg-slate-50 text-muted-foreground hover:bg-slate-100"
                              }`}
                            >
                              <span className={`h-2 w-2 rounded-full ${step1.shiftId === s.id ? "bg-primary" : "bg-muted-foreground/40"}`} />
                              <span className="leading-tight">
                                <span className="block">{s.name}</span>
                                <span className="block text-[10px] font-normal opacity-70">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                        {step1Errors.shiftId && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.shiftId}</p>}
                      </Field>

                      <Field label="Tanggal Produksi" required className="md:col-span-3">
                        <DateInput
                          value={step1.prodDate}
                          onChange={e => { clearE("prodDate"); setStep1(f => ({ ...f, prodDate: e.target.value })); }}
                          className={step1Errors.prodDate ? "border-destructive" : ""}
                        />
                        {step1Errors.prodDate && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.prodDate}</p>}
                      </Field>

                      {/* Row 3: Plan Start · Plan Finish · Actual Start */}
                      <Field label="Plan Mulai" className="md:col-span-2">
                        <TimeInput
                          value={step1.planStartTime}
                          onChange={e => setStep1(f => ({ ...f, planStartTime: e.target.value }))}
                        />
                      </Field>
                      <Field label="Plan Selesai" className="md:col-span-2">
                        <TimeInput
                          value={step1.planFinishTime}
                          onChange={e => setStep1(f => ({ ...f, planFinishTime: e.target.value }))}
                        />
                      </Field>
                      <Field label="Actual Mulai" className="md:col-span-2">
                        <TimeInput
                          value={step1.actualStartTime}
                          onChange={e => setStep1(f => ({ ...f, actualStartTime: e.target.value }))}
                        />
                      </Field>

                      {/* Row 4: Line · Group */}
                      <Field label="Lini Produksi" required className="md:col-span-6">
                        <select
                          className={`h-10 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:bg-white ${step1Errors.lineId ? "border-destructive bg-red-50" : ""}`}
                          value={step1.lineId}
                          onChange={e => {
                            clearE("lineId");
                            setStep1(f => ({
                              ...f,
                              lineId:    e.target.value,
                              groupId:   "",
                              productId: "",
                            }));
                          }}
                        >
                          <option value="">— Pilih Lini —</option>
                          {visibleLines.map((l: any) => (
                            <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                          ))}
                        </select>
                        {step1Errors.lineId && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.lineId}</p>}
                      </Field>

                      {step1.lineId && (
                        <Field label="Group / Regu" required className="md:col-span-6">
                          {groupsLoading ? (
                            <InlineLoading label="Memuat group…" />
                          ) : lineGroups.length === 0 ? (
                            <div className="flex items-center gap-2 h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-800">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              Belum ada group untuk lini ini — tambahkan di Admin → Group / Regu.
                            </div>
                          ) : (
                            <>
                              <div className={`flex gap-2 flex-wrap rounded-xl p-1 -m-1 ${step1Errors.groupId ? "ring-1 ring-destructive/60 ring-offset-1" : ""}`}>
                                {lineGroups.map((g: any) => {
                                  const isLeaderGroup = leaderGroups.some((lg: any) => lg.group_id === g.id);
                                  return (
                                    <button
                                      key={g.id}
                                      type="button"
                                      onClick={() => { clearE("groupId"); setStep1(f => ({ ...f, groupId: g.id })); }}
                                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                                        step1.groupId === g.id
                                          ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                                          : "border-border bg-slate-50 text-muted-foreground hover:bg-slate-100"
                                      }`}
                                    >
                                      <div className={`h-6 w-6 rounded-lg grid place-items-center text-[10px] font-bold ${
                                        step1.groupId === g.id ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                                      }`}>
                                        {g.code.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
                                      </div>
                                      {g.code}
                                      {isLeaderGroup && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">Anda</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              {step1Errors.groupId && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.groupId}</p>}
                            </>
                          )}
                        </Field>
                      )}
                      {!step1.lineId && step1Errors.groupId && (
                        <div className="md:col-span-6">
                          <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.groupId}</p>
                        </div>
                      )}

                      {/* Row 5: Produk · Rencana Qty */}
                      <Field
                        label={
                          step1.lineId && !lineProductsLoading
                            ? `Produk Yang Diproduksi (${lineProducts.length} produk di lini ini)`
                            : "Produk Yang Diproduksi"
                        }
                        required
                        className="md:col-span-3"
                      >
                        {lineProductsLoading && step1.lineId ? (
                          <InlineLoading label="Memuat produk…" />
                        ) : (
                          <select
                            className={`h-10 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:bg-white ${step1Errors.productId ? "border-destructive bg-red-50" : ""}`}
                            value={step1.productId}
                            onChange={e => { clearE("productId"); setStep1(f => ({ ...f, productId: e.target.value })); }}
                          >
                            <option value="">— Pilih Produk —</option>
                            {(step1.lineId ? lineProducts : []).map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.code} — {p.name}{p.model ? ` (${p.model})` : ""}
                              </option>
                            ))}
                          </select>
                        )}
                        {step1Errors.productId && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.productId}</p>}
                        {step1.lineId && !lineProductsLoading && lineProducts.length === 0 && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            Belum ada produk untuk lini ini. Atur di Admin → Produk.
                          </p>
                        )}
                      </Field>

                      <Field label="Rencana Qty" required className="md:col-span-3">
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            className={`h-10 w-full rounded-xl border bg-slate-50 px-3 pr-12 text-sm font-mono outline-none focus:border-primary focus:bg-white ${step1Errors.targetQty ? "border-destructive bg-red-50" : ""}`}
                            value={step1.targetQty}
                            onChange={e => { clearE("targetQty"); setStep1(f => ({ ...f, targetQty: parseInt(e.target.value) || 0 })); }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">pcs</span>
                        </div>
                        {step1Errors.targetQty && <p className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{step1Errors.targetQty}</p>}
                      </Field>

                    </div>
                  )}

                  {/* Group selected indicator */}
                  {step1.groupId && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-2.5 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-violet-500 grid place-items-center text-white text-[10px] font-bold">
                        {resolvedGroupCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-violet-800">Group: <span className="font-bold">{resolvedGroupCode}</span></span>
                      {leaderGroups.some((lg: any) => lg.group_id === step1.groupId) && (
                        <span className="chip text-[10px] bg-blue-100 text-blue-700 border-blue-200">👤 Group Anda</span>
                      )}
                      <span className="ml-auto chip text-[10px] bg-violet-100 text-violet-700 border-violet-200">✓ Siap</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => { if (validateStep1()) setSetupStep(2); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
                    >
                      Lanjut <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2 · Man Power & WI ── */}
              {setupStep === 2 && (
                <div key="step-2" className="space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
                    <strong>Tujuan:</strong> Verifikasi penugasan operator di setiap POS, catat kehadiran, tetapkan pengganti jika ada yang tidak hadir, dan pastikan setiap operator memenuhi <strong>Skill Requirement & W/I</strong> standar sebelum produksi dimulai.
                  </div>

                  {!step1.lineId ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
                      <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-amber-800 font-semibold">Pilih Lini Produksi di Step 1 terlebih dahulu</p>
                    </div>
                  ) : posLoading ? (
                    <InlineLoading label="Memuat data Workstation & operator…" className="py-6" />
                  ) : linePOS.length === 0 ? (
                    <EmptyState
                      compact
                      title="Belum ada Workstation"
                      description="Tambahkan Workstation untuk line ini di menu Admin → Line & Proses."
                    />
                  ) : (
                    <div className="space-y-3">
                      {/* Group badge */}
                      {resolvedGroupId ? (
                        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                          <Users className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="text-xs font-semibold text-blue-800">Formasi group: <span className="font-bold">{resolvedGroupCode}</span></span>
                          <span className="ml-auto text-[10px] text-blue-600 font-mono">{linePOS.length} Workstation · {new Set(linePOS.flatMap((p: any) => p.default_assignments?.map((a: any) => a.operator_id) || [])).size} operator</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-xs font-semibold text-amber-800">Belum ada group — formasi default tidak tersedia. Operator dapat dipilih manual.</span>
                        </div>
                      )}

                      {/* POS table */}
                      <div className="rounded-2xl border overflow-hidden divide-y">
                        <div className="hidden sm:grid sm:grid-cols-[2.25rem_1fr_1fr_7.5rem_5.5rem] gap-3 items-center px-4 py-2 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          <span />
                          <span>Workstation</span>
                          <span>Operator</span>
                          <span className="text-center">Kehadiran</span>
                          <span className="text-center">Status</span>
                        </div>
                        {linePOS.map((pos: any, idx: number) => {
                          const assignment = posOpAssignments[pos.process_id] ?? { isAbsent: false, replacementId: null };
                          return (
                            <div key={pos.process_id} className="grid grid-cols-[2.25rem_1fr] sm:grid-cols-[2.25rem_1fr_1fr_7.5rem_5.5rem] gap-3 items-center px-4 py-3">
                              <span className="h-7 w-7 rounded-lg grid place-items-center bg-slate-100 text-xs font-bold text-muted-foreground">{idx + 1}</span>
                              <div>
                                <div className="text-sm font-semibold">{pos.processes?.name ?? "—"}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{pos.processes?.code ?? "—"}</div>
                              </div>
                              <div className="hidden sm:block text-sm">
                                {pos.default_assignments && pos.default_assignments.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {pos.default_assignments.map((op: any) => (
                                      <span key={op.operator_id} className="chip chip-info text-xs">
                                        {op.operators?.full_name || op.operators?.initials || "—"}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Belum ada operator</span>
                                )}
                              </div>
                              <div className="hidden sm:flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setPosOpAssignments(prev => ({
                                    ...prev,
                                    [pos.process_id]: { ...assignment, isAbsent: !assignment.isAbsent },
                                  }))}
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                    assignment.isAbsent
                                      ? "bg-red-50 border-red-200 text-red-700"
                                      : "bg-green-50 border-green-200 text-green-700"
                                  }`}
                                >
                                  {assignment.isAbsent ? "Absent" : "Hadir"}
                                </button>
                              </div>
                              <div className="hidden sm:flex items-center justify-center">
                                <span className={`chip text-[10px] ${assignment.isAbsent ? "chip-danger" : "chip-success"}`}>
                                  {assignment.isAbsent ? "⚠ Absent" : "✓ Ready"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-2">
                    <button onClick={() => setSetupStep(1)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-slate-50">
                      Kembali
                    </button>
                    <button onClick={() => setSetupStep(3)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm">
                      Lanjut <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3 · Autonomous Check Sheet ── */}
              {setupStep === 3 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
                    <strong>Autonomous Maintenance:</strong> Lakukan pengecekan kondisi mesin, material, 5S, dan kepatuhan W/I
                  </div>

                  <div className="space-y-4">
                    {checkGroups.map(group => (
                      <div key={group.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-2xl">{group.icon}</span>
                          <h3 className="font-semibold text-slate-900">{group.title}</h3>
                          <span className="ml-auto text-sm text-slate-500">
                            {group.items.filter(item => checkedItems.includes(item.id)).length}/{group.items.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.items.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checkedItems.includes(item.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setCheckedItems(prev => [...prev, item.id]);
                                  } else {
                                    setCheckedItems(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-slate-700">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between gap-2">
                    <button onClick={() => setSetupStep(2)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-slate-50">
                      Kembali
                    </button>
                    <button onClick={() => setSetupStep(4)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm">
                      Lanjut <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4 · Konfirmasi ── */}
              {setupStep === 4 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border bg-emerald-50/70 p-4">
                    <div className="mb-3 text-sm font-semibold text-emerald-700">📋 Ringkasan Setup Pre-Production</div>
                    <div className="space-y-2 text-sm">
                      <div>✅ Step 1: Info Dasar — {step1.workOrderNo ? "Completed" : "Incomplete"}</div>
                      <div>✅ Step 2: Man Power & WI — {linePOS.length > 0 ? "Ready" : "No data"}</div>
                      <div>✅ Step 3: Auto Check Sheet — {checkedItems.length}/{totalChecks} items checked</div>
                    </div>
                  </div>

                  <Field label="Catatan Setup (opsional)">
                    <textarea
                      className="w-full p-3 border rounded-xl resize-none"
                      rows={3}
                      placeholder="Tambahkan catatan atau informasi tambahan..."
                      value={setupNotes}
                      onChange={e => setSetupNotes(e.target.value)}
                    />
                  </Field>

                  <div className="flex justify-between gap-2">
                    <button onClick={() => setSetupStep(3)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-slate-50">
                      Kembali
                    </button>
                    <button
                      onClick={handleStartShift}
                      disabled={setupBusy || createRun.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                    >
                      {(setupBusy || createRun.isPending)
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Memulai…</>
                        : <><Send className="h-4 w-4" /> Mulai Produksi</>
                      }
                    </button>
                  </div>
                </div>
              )}

            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
