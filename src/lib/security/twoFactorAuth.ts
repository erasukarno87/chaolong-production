/**
 * Two-Factor Authentication (2FA) System
 * 
 * Provides TOTP-based 2FA for enhanced security.
 * Uses authenticator apps like Google Authenticator, Authy, etc.
 */

import { supabase } from '@/integrations/supabase/client';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  setupAt?: string;
}

class TwoFactorAuth {
  private static instance: TwoFactorAuth;

  private constructor() {}

  static getInstance(): TwoFactorAuth {
    if (!TwoFactorAuth.instance) {
      TwoFactorAuth.instance = new TwoFactorAuth();
    }
    return TwoFactorAuth.instance;
  }

  /**
   * Generate TOTP secret and QR code for setup
   */
  async generateSetup(userId: string, email: string): Promise<TwoFactorSetup> {
    try {
      // Call Supabase Edge Function to generate 2FA setup
      const { data, error } = await supabase.functions.invoke('generate-2fa-setup', {
        body: { userId, email },
      });

      if (error) throw error;

      return {
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
        backupCodes: data.backupCodes,
      };
    } catch (error) {
      console.error('Failed to generate 2FA setup:', error);
      throw new Error('Failed to generate 2FA setup');
    }
  }

  /**
   * Verify TOTP code during setup
   */
  async verifySetup(userId: string, code: string, secret: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-setup', {
        body: { userId, code, secret },
      });

      if (error) throw error;

      return data.verified === true;
    } catch (error) {
      console.error('Failed to verify 2FA setup:', error);
      return false;
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_2fa_settings')
        .upsert({
          user_id: userId,
          enabled: true,
          secret_encrypted: secret,
          backup_codes_encrypted: JSON.stringify(backupCodes),
          verified_at: new Date().toISOString(),
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      return false;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disable(userId: string, code: string): Promise<boolean> {
    try {
      // Verify code before disabling
      const isValid = await this.verifyCode(userId, code);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      const { error } = await supabase
        .from('user_2fa_settings')
        .update({ enabled: false })
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      return false;
    }
  }

  /**
   * Verify TOTP code during login
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { userId, code },
      });

      if (error) throw error;

      return data.verified === true;
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-backup-code', {
        body: { userId, backupCode },
      });

      if (error) throw error;

      // If valid, mark backup code as used
      if (data.verified) {
        await this.markBackupCodeUsed(userId, backupCode);
      }

      return data.verified === true;
    } catch (error) {
      console.error('Failed to verify backup code:', error);
      return false;
    }
  }

  /**
   * Get 2FA status for user
   */
  async getStatus(userId: string): Promise<TwoFactorStatus> {
    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('enabled, verified_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { enabled: false, verified: false };
      }

      return {
        enabled: data.enabled,
        verified: !!data.verified_at,
        setupAt: data.verified_at,
      };
    } catch (error) {
      console.error('Failed to get 2FA status:', error);
      return { enabled: false, verified: false };
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string, verificationCode: string): Promise<string[]> {
    try {
      // Verify code before regenerating
      const isValid = await this.verifyCode(userId, verificationCode);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      const { data, error } = await supabase.functions.invoke('regenerate-backup-codes', {
        body: { userId },
      });

      if (error) throw error;

      return data.backupCodes;
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Mark backup code as used
   */
  private async markBackupCodeUsed(userId: string, backupCode: string): Promise<void> {
    try {
      await supabase.functions.invoke('mark-backup-code-used', {
        body: { userId, backupCode },
      });
    } catch (error) {
      console.error('Failed to mark backup code as used:', error);
    }
  }

  /**
   * Check if 2FA is required for user
   */
  async isRequired(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status.enabled && status.verified;
  }
}

// Export singleton instance
export const twoFactorAuth = TwoFactorAuth.getInstance();

// Convenience functions
export const generate2FASetup = (userId: string, email: string) =>
  twoFactorAuth.generateSetup(userId, email);

export const verify2FASetup = (userId: string, code: string, secret: string) =>
  twoFactorAuth.verifySetup(userId, code, secret);

export const enable2FA = (userId: string, secret: string, backupCodes: string[]) =>
  twoFactorAuth.enable(userId, secret, backupCodes);

export const disable2FA = (userId: string, code: string) =>
  twoFactorAuth.disable(userId, code);

export const verify2FACode = (userId: string, code: string) =>
  twoFactorAuth.verifyCode(userId, code);

export const verify2FABackupCode = (userId: string, backupCode: string) =>
  twoFactorAuth.verifyBackupCode(userId, backupCode);

export const get2FAStatus = (userId: string) => twoFactorAuth.getStatus(userId);

export const is2FARequired = (userId: string) => twoFactorAuth.isRequired(userId);

export default twoFactorAuth;