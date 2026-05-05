/**
 * Type definitions for Monitoring components
 */

export type DashboardPanel = 'status' | 'oee' | 'skill';

export interface CheckItem {
  label: string;
  time: string;
  done: boolean;
}

export interface HourPoint {
  hour: string;
  actual: number;
  target: number;
  note: string;
}

export interface RatioItem {
  label: string;
  value: string;
  pct: number;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

export interface SkillRow {
  name: string;
  initials: string;
  join: string;
  skills: number[];
  wi: 'PASS' | 'CHECK' | 'FAIL';
}

export interface StatusCheckItem {
  label: string;
  icon?: string;
  done: boolean;
}

export interface DowntimeEvent {
  id: string;
  marker: 'STOP' | 'CALL' | 'WAIT';
  label: string;
  time: string;
  badge: 'Resolved' | 'On-going' | 'Pending';
  meta: string;
}

export interface PanelCardProps {
  title: string;
  icon: React.ElementType;
  badge?: React.ReactNode;
  children: React.ReactNode;
  density?: 'compact' | 'comfortable';
}

export interface DashboardMetrics {
  oee: number;
  achievement: number;
  totalActual: number;
  targetQty: number;
  startTime: Date | null;
  statusChecks: StatusCheckItem[];
  autonomousChecks: StatusCheckItem[];
  m4Items: RatioItem[];
  scwLog: DowntimeEvent[];
}
