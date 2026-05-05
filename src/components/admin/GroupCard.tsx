/**
 * GroupCard — displays and manages a single Group's leaders
 * and default operator-to-workstation assignments.
 *
 * Also exports shared types used by GroupsTab.
 */
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormModal } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  UserPlus, X, Plus, ChevronDown, ChevronUp, Users, Pencil, Trash2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types (exported for GroupsTab) ──────────────────────────────────────────

export interface Line     { id: string; code: string; name: string; active: boolean; }
export interface Operator { id: string; full_name: string; employee_code: string | null; initials: string | null; avatar_color: string | null; role: string; active: boolean; }
export interface Process  { id: string; code: string; name: string; sort_order: number; }
export interface LeaderProfile { user_id: string; display_name: string | null; email: string | null; }

interface GroupLeader { id: string; user_id: string; profiles: LeaderProfile; }
interface GroupPosAssignment {
  id: string; process_id: string; operator_id: string;
  processes: Process; operators: Operator;
}
export interface Group {
  id: string; line_id: string; code: string; sort_order: number; active: boolean;
  group_leaders: GroupLeader[];
  group_process_assignments: GroupPosAssignment[];
}

// ─── Avatars ──────────────────────────────────────────────────────────────────

export function OpAvatar({ op, size = "sm" }: { op: Pick<Operator, "full_name" | "initials" | "avatar_color">; size?: "sm" | "xs" }) {
  const dim = size === "xs" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]";
  return (
    <div className={`${dim} rounded-md grid place-items-center text-white font-bold shrink-0`}
      style={{ background: op.avatar_color ?? "hsl(var(--primary))" }}>
      {op.initials ?? op.full_name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function LeaderAvatar({ profile, size = "sm" }: { profile: LeaderProfile; size?: "sm" | "xs" }) {
  const dim = size === "xs" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]";
  const label = (profile.display_name ?? profile.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className={`${dim} rounded-md grid place-items-center text-white font-bold shrink-0 bg-primary`}>
      {label}
    </div>
  );
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

export interface GroupCardProps {
  group: Group;
  lineProcesses: Process[];
  allOperators: Operator[];
  leaderUsers: LeaderProfile[];
  onEdit: (g: Group) => void;
  onDelete: (g: Group) => void;
  onRefresh: () => void;
}

export function GroupCard({
  group, lineProcesses, allOperators, leaderUsers, onEdit, onDelete, onRefresh,
}: GroupCardProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [leaderModal, setLeaderModal] = useState(false);
  const [posModal, setPosModal] = useState<{ processId: string; processName: string } | null>(null);
  const [selectedLeaderUserId, setSelectedLeaderUserId] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["groups"] }); onRefresh(); };

  const addLeader = useMutation({
    mutationFn: async (userId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("group_leaders") as any).insert({ group_id: group.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Leader ditambahkan"); invalidate(); setLeaderModal(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLeader = useMutation({
    mutationFn: async (leaderId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("group_leaders") as any).delete().eq("id", leaderId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Leader dihapus"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPosAssignment = useMutation({
    mutationFn: async ({ processId, operatorId }: { processId: string; operatorId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("group_process_assignments") as any)
        .insert({ group_id: group.id, process_id: processId, operator_id: operatorId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Operator ditambahkan ke Workstation"); invalidate(); setPosModal(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePosAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("group_process_assignments") as any).delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Dihapus dari formasi"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignedLeaderUserIds = new Set(group.group_leaders.map(gl => gl.user_id));

  const assignmentsByPOS = useMemo(() => {
    const map = new Map<string, GroupPosAssignment[]>();
    for (const asgn of group.group_process_assignments) {
      const list = map.get(asgn.process_id) ?? [];
      list.push(asgn);
      map.set(asgn.process_id, list);
    }
    return map;
  }, [group.group_process_assignments]);

  const assignedToPos = (processId: string) =>
    new Set((assignmentsByPOS.get(processId) ?? []).map(a => a.operator_id));

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${
      group.active ? "border-border bg-card" : "border-dashed border-muted bg-muted/30"
    }`}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        <button type="button" onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          <div className="h-8 w-8 rounded-xl bg-violet-100 grid place-items-center text-violet-700 font-bold text-xs font-mono shrink-0">
            {group.code.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">{group.code}</div>
            <div className="text-[10px] text-muted-foreground">
              {group.group_leaders.length} leader · {lineProcesses.length} Workstation
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`chip text-[10px] ${group.active ? "chip-success" : "chip-warning"}`}>
            {group.active ? "Aktif" : "Non-aktif"}
          </span>
          <Button size="icon" variant="ghost" onClick={() => onEdit(group)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(group)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          <button type="button" onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t divide-y">
          {/* ── Leaders ── */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Leaders / PIC</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => { setSelectedLeaderUserId(""); setLeaderModal(true); }}>
                <UserPlus className="h-3 w-3" /> Tambah
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.group_leaders.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">Belum ada leader — tambahkan di atas.</span>
              ) : (
                group.group_leaders.map(gl => {
                  const name = gl.profiles?.display_name ?? gl.profiles?.email ?? gl.user_id;
                  return (
                    <div key={gl.id} className="flex items-center gap-1.5 rounded-xl border bg-slate-50 pl-1.5 pr-2 py-1">
                      <LeaderAvatar profile={gl.profiles} size="xs" />
                      <span className="text-xs font-semibold">{name}</span>
                      <button type="button"
                        onClick={() => confirm(`Hapus ${name} dari leader group ini?`) && removeLeader.mutate(gl.id)}
                        className="ml-0.5 text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Formasi default ── */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Formasi Default Operator</span>
            </div>
            {lineProcesses.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Belum ada Workstation pada line ini. Tambahkan di tab Workstation.</p>
            ) : (
              <div className="rounded-xl border overflow-hidden divide-y">
                <div className="grid grid-cols-[4.5rem_1fr_1fr_2.5rem] gap-2 px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Kode</span><span>Workstation</span><span>Operator</span><span />
                </div>
                {lineProcesses.slice().sort((a, b) => a.sort_order - b.sort_order).map(proc => {
                  const assignments = assignmentsByPOS.get(proc.id) ?? [];
                  return (
                    <div key={proc.id} className="grid grid-cols-[4.5rem_1fr_1fr_2.5rem] gap-2 items-center px-3 py-2.5 hover:bg-slate-50/60 transition-colors">
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">{proc.code}</span>
                      <span className="text-xs font-medium text-foreground">{proc.name}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignments.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground/50 italic">Kosong</span>
                        ) : (
                          assignments.map(asgn => (
                            <div key={asgn.id} className="flex items-center gap-1 rounded-lg border bg-white pl-1 pr-1.5 py-0.5">
                              <OpAvatar op={asgn.operators} size="xs" />
                              <span className="text-[11px] font-semibold max-w-[80px] truncate">{asgn.operators.full_name}</span>
                              <button type="button" onClick={() => removePosAssignment.mutate(asgn.id)}
                                className="text-muted-foreground hover:text-destructive ml-0.5">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <button type="button"
                        onClick={() => { setSelectedOperator(""); setPosModal({ processId: proc.id, processName: proc.name }); }}
                        className="h-6 w-6 rounded-lg border grid place-items-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-colors"
                        title="Tambah operator ke Workstation ini">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: tambah leader ── */}
      <FormModal open={leaderModal} onOpenChange={setLeaderModal}
        title={`Tambah Leader — ${group.code}`} size="sm"
        onSubmit={() => { if (selectedLeaderUserId) addLeader.mutate(selectedLeaderUserId); }}
        busy={addLeader.isPending} submitLabel="Tambahkan">
        <div className="space-y-1.5">
          <Label>Pilih Leader / PIC</Label>
          <select className="h-10 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:bg-white"
            value={selectedLeaderUserId} onChange={e => setSelectedLeaderUserId(e.target.value)}>
            <option value="">— Pilih akun leader —</option>
            {leaderUsers.filter(u => !assignedLeaderUserIds.has(u.user_id)).map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.display_name ?? u.email ?? u.user_id}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">Hanya akun dengan role Leader atau Super Admin yang ditampilkan.</p>
        </div>
      </FormModal>

      {/* ── Modal: tambah operator ke POS ── */}
      {posModal && (
        <FormModal open={!!posModal} onOpenChange={() => setPosModal(null)}
          title={`Tambah Operator — ${posModal.processName}`} size="sm"
          onSubmit={() => { if (selectedOperator && posModal) addPosAssignment.mutate({ processId: posModal.processId, operatorId: selectedOperator }); }}
          busy={addPosAssignment.isPending} submitLabel="Tambahkan">
          <div className="space-y-1.5">
            <Label>Pilih Operator</Label>
            <select className="h-10 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:bg-white"
              value={selectedOperator} onChange={e => setSelectedOperator(e.target.value)}>
              <option value="">— Pilih operator —</option>
              {allOperators.filter(op => op.active && !assignedToPos(posModal.processId).has(op.id)).map(op => (
                <option key={op.id} value={op.id}>
                  {op.full_name}{op.employee_code ? ` (${op.employee_code})` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">Satu operator bisa diassign ke lebih dari satu Workstation dalam group yang sama.</p>
          </div>
        </FormModal>
      )}
    </div>
  );
}
