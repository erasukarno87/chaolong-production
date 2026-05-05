/**
 * Setup Step 2 Wrapper Component
 * Clean integration point untuk EnhancedSetupStep2
 */

import { Suspense, lazy } from "react";
import { AlertCircle } from "lucide-react";
import { InlineLoading, EmptyState } from "@/components/ui/states";

// Lazy load EnhancedSetupStep2 untuk avoid circular dependencies
const EnhancedSetupStep2 = lazy(() => import("./EnhancedSetupStep2").then(module => ({
  default: module.EnhancedSetupStep2
})));

interface SetupStep2WrapperProps {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
  lineOperators: any[];
  onStatusChange: (posId: string, operatorId: string, status: boolean) => void;
  onReplacementSelect: (posId: string, operatorId: string, replacementId: string) => void;
  step1: any;
  posLoading: boolean;
}

export function SetupStep2Wrapper({
  linePOS,
  posOpAssignments,
  opSkillsMap,
  lineOperators,
  onStatusChange,
  onReplacementSelect,
  step1,
  posLoading
}: SetupStep2WrapperProps) {
  // Handle edge cases
  if (!step1.lineId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-amber-800 font-semibold">Pilih Lini Produksi di Step 1 terlebih dahulu</p>
      </div>
    );
  }

  if (posLoading) {
    return <InlineLoading label="Memuat data Workstation & operator…" className="py-6" />;
  }

  if (linePOS.length === 0) {
    return (
      <EmptyState
        compact
        title="Belum ada Workstation"
        description="Tambahkan Workstation untuk line ini di menu Admin → Line & Proses."
      />
    );
  }

  return (
    <div className="enhanced-setup-step-2-wrapper">
      {/* Purpose description */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800 mb-4">
        <strong>Tujuan:</strong> Verifikasi penugasan operator di setiap POS, catat kehadiran, tetapkan pengganti jika ada yang tidak hadir, dan pastikan setiap operator memenuhi <strong>Skill Requirement & W/I</strong> standar sebelum produksi dimulai.
      </div>

      {/* Enhanced Setup Step 2 Component */}
      <Suspense fallback={<InlineLoading label="Memuat antarmuka…" className="py-8 justify-center" />}>
        <EnhancedSetupStep2
          linePOS={linePOS}
          posOpAssignments={posOpAssignments}
          opSkillsMap={opSkillsMap}
          lineOperators={lineOperators}
          onStatusChange={onStatusChange}
          onReplacementSelect={onReplacementSelect}
        />
      </Suspense>
    </div>
  );
}
