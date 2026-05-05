/**
 * Two-Factor Authentication Setup Component
 * 
 * Allows users to enable/disable 2FA and manage backup codes
 */

import { useState, useEffect } from 'react';
import { Shield, Key, Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { twoFactorAuth, TwoFactorSetup as TwoFactorSetupData } from '@/lib/security/twoFactorAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function TwoFactorSetup() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'complete'>('status');

  useEffect(() => {
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const status = await twoFactorAuth.getStatus(user.id);
      setIsEnabled(status.enabled);
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const setup = await twoFactorAuth.generateSetup(user.id, user.email || '');
      setSetupData(setup);
      setStep('setup');
    } catch (error) {
      toast.error('Failed to generate 2FA setup');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!user || !setupData) return;

    setIsVerifying(true);
    try {
      const isValid = await twoFactorAuth.verifySetup(
        user.id,
        verificationCode,
        setupData.secret
      );

      if (isValid) {
        await twoFactorAuth.enable(user.id, setupData.secret, setupData.backupCodes);
        setIsEnabled(true);
        setStep('complete');
        toast.success('2FA enabled successfully!');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify code');
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!user) return;

    const code = prompt('Enter your 2FA code to disable:');
    if (!code) return;

    setIsLoading(true);
    try {
      const success = await twoFactorAuth.disable(user.id, code);
      if (success) {
        setIsEnabled(false);
        setStep('status');
        toast.success('2FA disabled successfully');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData) return;

    const content = `Two-Factor Authentication Backup Codes\n\nThese codes can be used to access your account if you lose your authenticator device.\nEach code can only be used once.\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes in a safe place!`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Backup codes downloaded');
  };

  if (isLoading && step === 'status') {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Status View */}
      {step === 'status' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isEnabled
                    ? '2FA is currently enabled on your account'
                    : '2FA is not enabled on your account'}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {!isEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Recommended for Admins</h4>
                    <p className="text-sm text-amber-800">
                      We strongly recommend enabling 2FA for accounts with administrative privileges
                      to protect against unauthorized access.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {isEnabled ? (
                <Button onClick={handleDisable} variant="destructive">
                  Disable 2FA
                </Button>
              ) : (
                <Button onClick={handleEnable} className="bg-blue-600 hover:bg-blue-700">
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup View */}
      {step === 'setup' && setupData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Set Up Two-Factor Authentication</h2>
            <p className="text-sm text-gray-600">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                <img src={setupData.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
                <code className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-mono">
                  {setupData.secret}
                </code>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full max-w-xs">
                Continue to Verification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verify View */}
      {step === 'verify' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Setup</h2>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="max-w-xs mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify and Enable'
                )}
              </Button>

              <Button
                onClick={() => setStep('setup')}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complete View */}
      {step === 'complete' && setupData && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2FA Enabled Successfully!</h2>
            <p className="text-sm text-gray-600">
              Your account is now protected with two-factor authentication
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Key className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Save Your Backup Codes</h3>
                <p className="text-sm text-gray-600 mb-3">
                  These codes can be used to access your account if you lose your authenticator
                  device. Each code can only be used once.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code, index) => (
                  <code key={index} className="text-sm font-mono text-gray-700">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Codes
              </Button>
              <Button onClick={() => setStep('status')} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}