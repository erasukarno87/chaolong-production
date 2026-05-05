/**
 * Rate Limiter
 * 
 * Client-side rate limiting to prevent abuse and protect against brute force attacks.
 * Works in conjunction with server-side rate limiting.
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blockedUntil?: Date;
}

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if an action is allowed
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = this.storage.get(key);

    // Check if currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.blockedUntil),
        blockedUntil: new Date(entry.blockedUntil),
      };
    }

    // No entry or window expired - allow and create new entry
    if (!entry || now - entry.firstAttempt > config.windowMs) {
      this.storage.set(key, {
        attempts: 1,
        firstAttempt: now,
      });

      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetAt: new Date(now + config.windowMs),
      };
    }

    // Within window - check if limit exceeded
    if (entry.attempts >= config.maxAttempts) {
      const blockDuration = config.blockDurationMs || config.windowMs * 2;
      const blockedUntil = now + blockDuration;

      this.storage.set(key, {
        ...entry,
        blockedUntil,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.firstAttempt + config.windowMs),
        blockedUntil: new Date(blockedUntil),
      };
    }

    // Within window and under limit - increment and allow
    entry.attempts++;
    this.storage.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxAttempts - entry.attempts,
      resetAt: new Date(entry.firstAttempt + config.windowMs),
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Get current status for a key
   */
  getStatus(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetAt: new Date(now + config.windowMs),
      };
    }

    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.blockedUntil),
        blockedUntil: new Date(entry.blockedUntil),
      };
    }

    if (now - entry.firstAttempt > config.windowMs) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetAt: new Date(now + config.windowMs),
      };
    }

    return {
      allowed: entry.attempts < config.maxAttempts,
      remaining: Math.max(0, config.maxAttempts - entry.attempts),
      resetAt: new Date(entry.firstAttempt + config.windowMs),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.storage.forEach((entry, key) => {
      // Remove if window expired and not blocked
      if (!entry.blockedUntil && now - entry.firstAttempt > 3600000) {
        // 1 hour
        keysToDelete.push(key);
      }
      // Remove if block expired
      else if (entry.blockedUntil && entry.blockedUntil < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.storage.delete(key));
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();

// Predefined rate limit configs
export const RateLimitConfigs = {
  // Login attempts: 5 attempts per 15 minutes
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  },

  // Password reset: 3 attempts per hour
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 2 * 60 * 60 * 1000, // Block for 2 hours
  },

  // API calls: 100 requests per minute
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  },

  // Form submissions: 10 per minute
  formSubmit: {
    maxAttempts: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 2 * 60 * 1000, // Block for 2 minutes
  },

  // PIN verification: 3 attempts per 5 minutes
  pinVerification: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
  },
} as const;

// Convenience functions
export const checkRateLimit = (key: string, config: RateLimitConfig) =>
  rateLimiter.check(key, config);

export const resetRateLimit = (key: string) => rateLimiter.reset(key);

export const getRateLimitStatus = (key: string, config: RateLimitConfig) =>
  rateLimiter.getStatus(key, config);

export default rateLimiter;