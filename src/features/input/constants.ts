/**
 * Input feature constants and magic numbers.
 * Extracted for better maintainability and self-documenting code.
 */

// Time constants (in minutes)
export const SHIFT_MINUTES_DEFAULT = 480;   // 8 hours
export const BREAK_MINUTES_DEFAULT = 60;   // 1 hour
export const PRODUCTIVE_MINUTES_MIN = 60;  // Minimum 1 hour productive time
export const MINUTES_PER_DAY = 1440;       // 24 hours

// Date/time constants (in milliseconds)
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = MS_PER_SECOND * 60;
export const MS_PER_HOUR = MS_PER_MINUTE * 60;
export const MS_PER_DAY = MS_PER_HOUR * 24;

// Draft persistence
export const DRAFT_EXPIRY_HOURS = 24;
export const DRAFT_EXPIRY_MS = MS_PER_DAY * DRAFT_EXPIRY_HOURS;

// Default values
export const DEFAULT_TARGET_QTY = 1200;
export const DEFAULT_WORK_ORDER_PREFIX = "WO";

// Check sheet
export const DEFAULT_SAMPLE_CHECKS_COUNT = 5;

// Downtime constants
export const MAX_DOWNTIME_MINUTES = 480;  // 8 hours max
export const MIN_DOWNTIME_MINUTES = 1;    // 1 minute min

// NG (defect) constants
export const MAX_NG_QUANTITY = 10000;     // Maximum NG quantity
export const MIN_NG_QUANTITY = 1;         // Minimum NG quantity

// Skill level constants
export const SKILL_LEVEL_MIN = 0;         // No skill
export const SKILL_LEVEL_MAX = 4;         // Expert
export const SKILL_LEVEL_DEFAULT_REQ = 2; // Competent (default requirement)

// Real-time updates
export const REALTIME_RECONNECT_ATTEMPTS = 5;
export const REALTIME_RECONNECT_DELAY_MS = 3000;
export const REALTIME_HEARTBEAT_INTERVAL_MS = 30000;
export const REALTIME_MAX_UPDATES = 50;   // Keep last N updates
export const REALTIME_MAX_ALERTS = 10;    // Keep last N alerts

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Performance thresholds
export const HIGH_NG_RATE_THRESHOLD = 10;  // 10% NG rate is high
export const HIGH_DOWNTIME_THRESHOLD = 20; // 20% downtime is high

// UI constants
export const MOBILE_BREAKPOINT = 768;      // px
export const TABLET_BREAKPOINT = 1024;     // px
