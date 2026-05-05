export interface MonitoringAlert {
  type: "warning" | "danger" | "info";
  message: string;
  threshold?: number;
  currentValue?: number;
}

export interface ProductionTarget {
  quantity: number;
  hourlyTarget: number;
  achievement: number;
  status: "on-track" | "at-risk" | "behind" | "exceeded";
}

export interface QualityMetrics {
  ngRatio: number;
  totalDefects: number;
  totalProduction: number;
  status: "excellent" | "good" | "acceptable" | "critical";
}

export interface DowntimeAnalysis {
  totalMinutes: number;
  plannedMinutes: number;
  availabilityRate: number;
  lossPercentage: number;
  status: "excellent" | "good" | "concerning" | "critical";
}

export class MonitoringService {
  /**
   * Calculate production target status based on achievement percentage
   */
  static calculateProductionStatus(achievement: number): ProductionTarget["status"] {
    if (achievement >= 100) return "exceeded";
    if (achievement >= 90) return "on-track";
    if (achievement >= 75) return "at-risk";
    return "behind";
  }

  /**
   * Generate production alerts based on current metrics
   */
  static generateProductionAlerts(
    achievement: number,
    hourlyActual: number,
    hourlyTarget: number,
    timeRemaining: number
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    // Achievement alerts
    if (achievement < 50 && timeRemaining < 0.3) {
      alerts.push({
        type: "danger",
        message: "Production target at risk - less than 50% achievement with limited time remaining",
        threshold: 50,
        currentValue: achievement,
      });
    } else if (achievement < 75 && timeRemaining < 0.5) {
      alerts.push({
        type: "warning",
        message: "Production falling behind schedule",
        threshold: 75,
        currentValue: achievement,
      });
    }

    // Hourly output alerts
    const hourlyPerformance = (hourlyActual / hourlyTarget) * 100;
    if (hourlyPerformance < 60) {
      alerts.push({
        type: "warning",
        message: "Hourly output significantly below target",
        threshold: 60,
        currentValue: hourlyPerformance,
      });
    }

    return alerts;
  }

  /**
   * Calculate quality status based on NG ratio
   */
  static calculateQualityStatus(ngRatio: number): QualityMetrics["status"] {
    if (ngRatio <= 1) return "excellent";
    if (ngRatio <= 2) return "good";
    if (ngRatio <= 5) return "acceptable";
    return "critical";
  }

  /**
   * Generate quality alerts
   */
  static generateQualityAlerts(ngRatio: number, totalDefects: number): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    if (ngRatio > 5) {
      alerts.push({
        type: "danger",
        message: "Critical quality issue - NG ratio exceeds 5%",
        threshold: 5,
        currentValue: ngRatio,
      });
    } else if (ngRatio > 2) {
      alerts.push({
        type: "warning",
        message: "Quality degradation detected",
        threshold: 2,
        currentValue: ngRatio,
      });
    }

    // Defect concentration alert
    if (totalDefects > 50) {
      alerts.push({
        type: "warning",
        message: "High defect concentration detected",
        currentValue: totalDefects,
      });
    }

    return alerts;
  }

  /**
   * Calculate downtime status
   */
  static calculateDowntimeStatus(
    totalMinutes: number,
    plannedMinutes: number
  ): DowntimeAnalysis["status"] {
    const availabilityRate = ((plannedMinutes - totalMinutes) / plannedMinutes) * 100;

    if (availabilityRate >= 95) return "excellent";
    if (availabilityRate >= 90) return "good";
    if (availabilityRate >= 80) return "concerning";
    return "critical";
  }

  /**
   * Generate downtime alerts
   */
  static generateDowntimeAlerts(
    totalMinutes: number,
    plannedMinutes: number,
    breakdownCount: number
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];
    const lossPercentage = (totalMinutes / plannedMinutes) * 100;

    if (lossPercentage > 20) {
      alerts.push({
        type: "danger",
        message: "Critical downtime loss exceeds 20% of planned time",
        threshold: 20,
        currentValue: lossPercentage,
      });
    } else if (lossPercentage > 10) {
      alerts.push({
        type: "warning",
        message: "Downtime loss exceeds 10% of planned time",
        threshold: 10,
        currentValue: lossPercentage,
      });
    }

    // Breakdown frequency alert
    if (breakdownCount > 3) {
      alerts.push({
        type: "warning",
        message: "Multiple breakdown events detected",
        currentValue: breakdownCount,
      });
    }

    return alerts;
  }

  /**
   * Calculate OEE status and recommendations
   */
  static analyzeOEE(oee: number, otr: number, per: number, qr: number): {
    status: "excellent" | "good" | "acceptable" | "poor";
    recommendations: string[];
    alerts: MonitoringAlert[];
  } {
    const recommendations: string[] = [];
    const alerts: MonitoringAlert[] = [];

    // Determine status
    let status: "excellent" | "good" | "acceptable" | "poor";
    if (oee >= 85) status = "excellent";
    else if (oee >= 75) status = "good";
    else if (oee >= 65) status = "acceptable";
    else status = "poor";

    // Generate recommendations based on components
    if (otr < 85) {
      recommendations.push("Improve equipment availability through preventive maintenance");
      recommendations.push("Reduce unplanned downtime with better breakdown response");
    }

    if (per < 85) {
      recommendations.push("Optimize cycle times and reduce minor stops");
      recommendations.push("Address speed losses and setup time reduction");
    }

    if (qr < 95) {
      recommendations.push("Implement quality control measures to reduce defects");
      recommendations.push("Review and improve production processes");
    }

    // Generate alerts
    if (oee < 65) {
      alerts.push({
        type: "danger",
        message: "OEE below acceptable threshold - immediate action required",
        threshold: 65,
        currentValue: oee,
      });
    } else if (oee < 75) {
      alerts.push({
        type: "warning",
        message: "OEE below target - improvement opportunities identified",
        threshold: 75,
        currentValue: oee,
      });
    }

    return { status, recommendations, alerts };
  }

  /**
   * Calculate skill compliance status
   */
  static calculateSkillCompliance(
    operators: Array<{ skills: Array<{ level: number; wi_pass: boolean }> }>
  ): {
    complianceRate: number;
    gapCount: number;
    status: "excellent" | "good" | "concerning" | "critical";
    alerts: MonitoringAlert[];
  } {
    const alerts: MonitoringAlert[] = [];
    
    if (operators.length === 0) {
      return {
        complianceRate: 0,
        gapCount: 0,
        status: "critical",
        alerts: [{
          type: "danger",
          message: "No operator skill data available",
        }],
      };
    }

    const allSkills = operators.flatMap(r => r.skills);
    const wiPassCount = allSkills.filter(s => s.wi_pass).length;
    const complianceRate = allSkills.length > 0 ? (wiPassCount / allSkills.length) * 100 : 0;
    const gapCount = operators.filter(r => r.skills.some(s => s.level < 2)).length;

    let status: "excellent" | "good" | "concerning" | "critical";
    if (complianceRate >= 95) status = "excellent";
    else if (complianceRate >= 85) status = "good";
    else if (complianceRate >= 70) status = "concerning";
    else status = "critical";

    if (complianceRate < 70) {
      alerts.push({
        type: "danger",
        message: "Critical skill compliance issue - less than 70% W/I pass rate",
        threshold: 70,
        currentValue: complianceRate,
      });
    } else if (complianceRate < 85) {
      alerts.push({
        type: "warning",
        message: "Skill compliance below target",
        threshold: 85,
        currentValue: complianceRate,
      });
    }

    if (gapCount > operators.length * 0.3) {
      alerts.push({
        type: "warning",
        message: "High number of operators with skill gaps",
        currentValue: gapCount,
      });
    }

    return { complianceRate, gapCount, status, alerts };
  }

  /**
   * Format duration in a human-readable format
   */
  static formatDuration(start: Date, now: Date): string {
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}j ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}d`;
  }

  /**
   * Calculate shift progress based on time
   */
  static calculateShiftProgress(
    startTime: Date,
    endTime: Date,
    currentTime: Date
  ): {
    progress: number;
    timeRemaining: number;
    isOvertime: boolean;
  } {
    const totalShiftMs = endTime.getTime() - startTime.getTime();
    const elapsedMs = currentTime.getTime() - startTime.getTime();
    const remainingMs = Math.max(0, endTime.getTime() - currentTime.getTime());

    const progress = Math.min(100, Math.max(0, (elapsedMs / totalShiftMs) * 100));
    const timeRemaining = remainingMs / totalShiftMs;
    const isOvertime = currentTime > endTime;

    return { progress, timeRemaining, isOvertime };
  }
}
