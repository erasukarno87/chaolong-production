/**
 * Smart Defaults Hook
 * Automation features untuk mengurangi manual input di Input Laporan
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types untuk smart defaults
interface OperatorAssignment {
  operator_id: string;
  position_id: string;
  skill_match: number;
  is_recommended: boolean;
}

interface PerformanceMetrics {
  avgAchievement: number;
  avgOEE: number;
  commonDefects: string[];
  commonDowntime: string[];
  optimalTarget: number;
}

/**
 * Hook untuk smart defaults berdasarkan user behavior dan historical data
 */
export function useSmartDefaults(productId?: string, lineId?: string) {
  const { user } = useAuth();

  // Get user's most used line
  const { data: userPreferences } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("shift_runs")
        .select("line_id, lines(id, code, name)")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Find most frequently used line
      const lineCounts = data?.reduce((acc, run) => {
        const lineId = run.line_id;
        acc[lineId] = (acc[lineId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const mostUsedLineId = Object.entries(lineCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      const mostUsedLine = data?.find(run => run.line_id === mostUsedLineId)?.lines;

      return {
        preferredLine: mostUsedLine,
        usageCount: lineCounts,
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get historical performance for target calculation
  const { data: historicalPerformance } = useQuery({
    queryKey: ["historical-performance", lineId, productId],
    queryFn: async () => {
      if (!lineId || !productId) return null;

      const { data, error } = await supabase
        .from("shift_runs")
        .select(`
          target_qty,
          hourly_target,
          actual_qty,
          ng_qty,
          downtime_minutes,
          hourly_outputs(actual_qty, ng_qty, target_qty),
          ng_categories(name, quantity)
        `)
        .eq("line_id", lineId)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Calculate performance metrics
      const runs = data || [];
      const avgAchievement = runs.reduce((sum, run) => {
        const achievement = run.target_qty > 0 ? (run.actual_qty / run.target_qty) * 100 : 0;
        return sum + achievement;
      }, 0) / runs.length;

      const avgOEE = runs.reduce((sum, run) => {
        const otr = 480 - (run.downtime_minutes || 0);
        const per = run.hourly_target > 0 ? 
          (run.actual_qty / (run.hourly_outputs?.length || 1) * run.hourly_target) * 100 : 0;
        const qr = (run.actual_qty + (run.ng_qty || 0)) > 0 ? 
          (run.actual_qty / (run.actual_qty + (run.ng_qty || 0))) * 100 : 0;
        const oee = (otr * per * qr) / 10000;
        return sum + oee;
      }, 0) / runs.length;

      // Find common defects and downtime
      const allDefects = runs.flatMap(run => run.ng_categories || []);
      const defectCounts = allDefects.reduce((acc, defect) => {
        acc[defect.name] = (acc[defect.name] || 0) + defect.quantity;
        return acc;
      }, {} as Record<string, number>);

      const commonDefects = Object.entries(defectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);

      // Calculate optimal target based on historical performance
      const optimalTarget = Math.round(
        runs.reduce((sum, run) => sum + run.actual_qty, 0) / runs.length * 1.1
      );

      return {
        avgAchievement,
        avgOEE,
        commonDefects,
        commonDowntime: [], // Add downtime analysis
        optimalTarget,
      };
    },
    enabled: !!lineId && !!productId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Get optimal operator assignments
  const { data: operatorAssignments } = useQuery({
    queryKey: ["operator-assignments", lineId],
    queryFn: async () => {
      if (!lineId) return [];

      const { data, error } = await supabase
        .from("processes")
        .select(`
          id,
          name,
          line_id,
          skill_requirements:skill_process_requirements(
            skill_id,
            required_level
          ),
          operators:operator_line_assignments(
            operator_id,
            is_default,
            operators_public(
              id,
              full_name,
              skills(id, skill_id, level, assessed_at)
            )
          )
        `)
        .eq("line_id", lineId)
        .eq("active", true);

      if (error) throw error;

      // Calculate skill match scores
      const assignments: OperatorAssignment[] = [];
      
      data?.forEach(process => {
        const requirements = process.skill_requirements || [];
        const operators = process.operators || [];

        operators.forEach(op => {
          const operatorSkills = op.operators_public?.skills || [];
          const skillMatches = requirements.map(req => {
            const operatorSkill = operatorSkills.find(s => s.skill_id === req.skill_id);
            return {
              required: req.required_level,
              actual: operatorSkill?.level || 0,
              match: operatorSkill ? 
                Math.min(1, operatorSkill.level / req.required_level) : 0
            };
          });

          const avgSkillMatch = skillMatches.length > 0 ?
            skillMatches.reduce((sum, match) => sum + match.match, 0) / skillMatches.length : 0;

          assignments.push({
            operator_id: op.operator_id,
            position_id: process.id,
            skill_match: avgSkillMatch,
            is_recommended: avgSkillMatch >= 0.8,
          });
        });
      });

      return assignments.sort((a, b) => b.skill_match - a.skill_match);
    },
    enabled: !!lineId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Get recommended shift based on current time
  const { data: recommendedShift } = useQuery({
    queryKey: ["recommended-shift"],
    queryFn: async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("active", true)
        .order("start_time");

      if (error) throw error;

      // Find shift that matches current time
      const currentShift = data?.find(shift => {
        const [startHour, startMinute] = shift.start_time.split(":").map(Number);
        const [endHour, endMinute] = shift.end_time.split(":").map(Number);
        
        const currentMinutes = currentHour * 60 + currentMinute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (endMinutes > startMinutes) {
          return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        } else {
          // Overnight shift
          return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        }
      });

      return currentShift || data?.[0]; // Fallback to first shift
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    preferredLine: userPreferences?.preferredLine,
    suggestedTarget: historicalPerformance?.optimalTarget,
    suggestedHourlyTarget: historicalPerformance?.optimalTarget ? 
      Math.round(historicalPerformance.optimalTarget / 8) : undefined,
    autoAssignedOperators: operatorAssignments,
    recommendedShift,
    historicalPerformance,
    isLoading: !userPreferences || !historicalPerformance || !operatorAssignments || !recommendedShift,
  };
}

/**
 * Hook untuk auto-fill data berdasarkan pattern recognition
 */
export function useAutoFill() {
  const { user } = useAuth();

  // Auto-fill NG entries based on historical patterns
  const { data: ngPatterns } = useQuery({
    queryKey: ["ng-patterns", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("ng_entries")
        .select(`
          ng_category_id,
          quantity,
          hour_label,
          shift_runs(
            product_id,
            line_id,
            created_at
          )
        `)
        .in("shift_runs.created_by", [user.id])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Analyze patterns
      const patterns = data?.reduce((acc, entry) => {
        const key = `${entry.shift_runs?.product_id}_${entry.hour_label}`;
        if (!acc[key]) {
          acc[key] = {
            categoryId: entry.ng_category_id,
            avgQuantity: 0,
            frequency: 0,
            hours: [] as string[],
          };
        }
        acc[key].avgQuantity = (acc[key].avgQuantity + entry.quantity) / 2;
        acc[key].frequency += 1;
        acc[key].hours.push(entry.hour_label);
        return acc;
      }, {} as Record<string, any>) || {};

      return Object.values(patterns);
    },
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Auto-fill downtime based on machine patterns
  const { data: downtimePatterns } = useQuery({
    queryKey: ["downtime-patterns", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("downtime_entries")
        .select(`
          category_id,
          duration_minutes,
          hour_label,
          kind,
          shift_runs(line_id, created_at)
        `)
        .in("shift_runs.created_by", [user.id])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Analyze downtime patterns by hour and line
      const patterns = data?.reduce((acc, entry) => {
        const key = `${entry.shift_runs?.line_id}_${entry.hour_label}`;
        if (!acc[key]) {
          acc[key] = {
            categoryId: entry.category_id,
            avgDuration: 0,
            frequency: 0,
            kind: entry.kind,
          };
        }
        acc[key].avgDuration = (acc[key].avgDuration + entry.duration_minutes) / 2;
        acc[key].frequency += 1;
        return acc;
      }, {} as Record<string, any>) || {};

      return Object.values(patterns);
    },
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    ngPatterns,
    downtimePatterns,
    isLoading: !ngPatterns || !downtimePatterns,
  };
}

/**
 * Hook untuk smart validation dan suggestions
 */
export function useSmartValidation() {
  const validateTarget = (target: number, historical: PerformanceMetrics) => {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (target > historical.optimalTarget * 1.2) {
      warnings.push("Target terlalu tinggi, historical achievement rata-rata " + 
        historical.avgAchievement.toFixed(1) + "%");
      suggestions.push("Saran: " + historical.optimalTarget + " pcs (berdasarkan historical)");
    }

    if (target < historical.optimalTarget * 0.8) {
      warnings.push("Target terlalu rendah, potensi untuk improvement");
      suggestions.push("Saran: " + Math.round(historical.optimalTarget * 1.1) + " pcs (dengan improvement)");
    }

    return { warnings, suggestions };
  };

  const validateOperatorAssignment = (assignments: OperatorAssignment[]) => {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const lowSkillAssignments = assignments.filter(a => a.skill_match < 0.6);
    if (lowSkillAssignments.length > 0) {
      warnings.push(`${lowSkillAssignments.length} operator dengan skill match < 60%`);
      suggestions.push("Pertimbangkan training atau re-assignment operator");
    }

    const unassignedPositions = assignments.filter(a => !a.operator_id);
    if (unassignedPositions.length > 0) {
      warnings.push(`${unassignedPositions.length} posisi belum ada operator`);
      suggestions.push("Assign operator sebelum memulai shift");
    }

    return { warnings, suggestions };
  };

  const predictIssues = (historical: PerformanceMetrics) => {
    const predictions: string[] = [];

    if (historical.avgAchievement < 85) {
      predictions.push("Risk: Achievement rendah, perlu monitoring tight");
    }

    if (historical.avgOEE < 75) {
      predictions.push("Risk: OEE rendah, perlu attention di downtime/quality");
    }

    if (historical.commonDefects.length > 0) {
      predictions.push("Focus: Monitor defect " + historical.commonDefects[0] + " (most common)");
    }

    return predictions;
  };

  return {
    validateTarget,
    validateOperatorAssignment,
    predictIssues,
  };
}
