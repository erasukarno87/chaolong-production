/**
 * Custom hooks for Monitoring page
 * Extracted from the main page to improve readability and maintainability
 */
import { useState, useEffect } from 'react';

export type DashboardPanel = 'status' | 'oee' | 'skill';

export type RatioItem = {
  label: string;
  value: string;
  pct: number;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple';
};

export type SkillRow = {
  name: string;
  initials: string;
  join: string;
  skills: number[];
  wi: 'PASS' | 'CHECK' | 'FAIL';
};

/**
 * Hook for managing dashboard state (panel, density, theme)
 */
export function useMonitoringDashboard() {
  const [currentPanel, setCurrentPanel] = useState<DashboardPanel>('status');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [now, setNow] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [isDarkMode]);

  return {
    currentPanel,
    setCurrentPanel,
    density,
    setDensity,
    isDarkMode,
    setIsDarkMode,
    now,
    setNow,
  };
}

/**
 * Format duration between two dates
 */
export function formatDuration(start: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}j ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}d`;
}

/**
 * Get color class for skill level
 */
export function getSkillTone(level: number): string {
  if (level === 0) return 'bg-slate-100 text-slate-500 border-slate-300';
  if (level === 1) return 'bg-amber-100 text-amber-900 border-amber-400';
  if (level === 2) return 'bg-blue-100 text-blue-700 border-blue-500';
  if (level === 3) return 'bg-emerald-100 text-emerald-800 border-emerald-500';
  return 'bg-violet-100 text-violet-800 border-violet-500';
}

/**
 * Convert skill level to label
 */
export function skillLabel(level: number): string {
  return ['0', '1', '2', '3', '4'][level] ?? '0';
}

/**
 * Get tone-specific classes for styling
 */
export function toneClasses(tone: RatioItem['tone']): {
  pill: string;
  fill: string;
  value: string;
} {
  switch (tone) {
    case 'blue':
      return {
        pill: 'bg-blue-100 text-blue-700',
        fill: 'bg-gradient-to-r from-[#1A6EFA] to-[#60A5FA]',
        value: 'text-[#1A6EFA]',
      };
    case 'green':
      return {
        pill: 'bg-emerald-100 text-emerald-700',
        fill: 'bg-gradient-to-r from-[#00B37D] to-[#34D399]',
        value: 'text-[#00B37D]',
      };
    case 'amber':
      return {
        pill: 'bg-amber-100 text-amber-700',
        fill: 'bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]',
        value: 'text-[#F59E0B]',
      };
    case 'red':
      return {
        pill: 'bg-red-100 text-red-700',
        fill: 'bg-gradient-to-r from-[#EF4444] to-[#FC8181]',
        value: 'text-[#EF4444]',
      };
    case 'purple':
      return {
        pill: 'bg-violet-100 text-violet-700',
        fill: 'bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD]',
        value: 'text-[#8B5CF6]',
      };
    default:
      return {
        pill: 'bg-slate-100 text-slate-700',
        fill: 'bg-slate-400',
        value: 'text-slate-700',
      };
  }
}
