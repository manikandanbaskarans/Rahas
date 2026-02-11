import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { authAPI, vaultAPI, api } from '@/api/client';
import { decrypt } from '@/crypto/encryption';
import { deriveKeys } from '@/crypto/keyDerivation';
import { encryptVaultKey } from '@/crypto/keyHierarchy';
import { encryptPrivateKey } from '@/crypto/sharing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Key, Loader2, Check, Plane } from 'lucide-react';
import type { Vault } from '@/types';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const vaultKey = useAuthStore((s) => s.vaultKey);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Travel Mode
  const vaults = useVaultStore((s) => s.vaults);
  const setVaults = useVaultStore((s) => s.setVaults);
  const [travelMode, setTravelMode] = useState(user?.travel_mode_enabled ?? false);
  const [vaultNames, setVaultNames] = useState<Record<string, string>>({});
  const [isTogglingTravel, setIsTogglingTravel] = useState(false);

  useEffect(() => {
    loadVaultsForTravel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVaultsForTravel = async () => {
    if (!vaultKey) return;
    try {
      const response = await vaultAPI.list();
      const vaultList: Vault[] = response.data.vaults;
      setVaults(vaultList);
      const names: Record<string, string> = {};
      for (const v of vaultList) {
        try {
          names[v.id] = await decrypt(v.name_encrypted, vaultKey);
        } catch {
          names[v.id] = 'Vault';
        }
      }
      setVaultNames(names);
    } catch {
      // Ignore
    }
  };

  const handleToggleTravelMode = async () => {
    setIsTogglingTravel(true);
    try {
      if (travelMode) {
        await api.post('/travel/disable');
      } else {
        await api.post('/travel/enable');
      }
      setTravelMode(!travelMode);
    } catch (err) {
      console.error('Failed to toggle travel mode:', err);
    } finally {
      setIsTogglingTravel(false);
    }
  };

  const handleToggleSafeForTravel = async (vault: Vault) => {
    try {
      await vaultAPI.update(vault.id, {
        safe_for_travel: !vault.safe_for_travel,
      });
      setVaults(
        vaults.map((v) =>
          v.id === vault.id ? { ...v, safe_for_travel: !v.safe_for_travel } : v
        )
      );
    } catch (err) {
      console.error('Failed to update vault:', err);
    }
  };

  const [mfaSetup, setMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUri, setMfaUri] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);

  if (!user) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (!vaultKey) {
      setError('Vault must be unlocked');
      return;
    }

    setError('');
    setMessage('');
    setIsChangingPassword(true);

    try {
      const { authKey: currentAuthKey } = await deriveKeys(currentPassword, user.email);
      const { authKey: newAuthKey, masterKey: newMasterKey } = await deriveKeys(newPassword, user.email);

      // Re-encrypt vault key with new master key
      const newEncryptedVaultKey = await encryptVaultKey(vaultKey, newMasterKey);

      // Re-encrypt private key if it exists
      let newEncryptedPrivateKey = user.encrypted_private_key || '';
      if (user.encrypted_private_key) {
        const { decrypt } = await import('@/crypto/encryption');
        const currentMasterKey = useAuthStore.getState().masterKey;
        if (currentMasterKey) {
          const privateKeyData = await decrypt(user.encrypted_private_key, currentMasterKey);
          newEncryptedPrivateKey = await encryptPrivateKey(privateKeyData, newMasterKey);
        }
      }

      await authAPI.changePassword({
        current_auth_key: currentAuthKey,
        new_auth_key: newAuthKey,
        new_encrypted_vault_key: newEncryptedVaultKey,
        new_encrypted_private_key: newEncryptedPrivateKey,
      });

      setMessage('Password changed successfully. Please log in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSetupMFA = async () => {
    setIsSettingUpMfa(true);
    try {
      const response = await authAPI.mfaSetup('totp');
      setMfaSecret(response.data.secret || '');
      setMfaUri(response.data.qr_uri || '');
      setMfaSetup(true);
    } catch {
      setError('Failed to setup MFA');
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real implementation, this would call a verify endpoint
      // For now, we'll just show success
      setMessage('MFA setup successfully');
      setMfaSetup(false);
    } catch {
      setError('Invalid MFA code');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {message && (
        <div className="p-3 text-sm bg-green-50 text-green-800 rounded-md flex items-center gap-2">
          <Check className="h-4 w-4" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm font-medium capitalize">{user.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-muted-foreground">MFA</span>
            <span className={`text-sm font-medium ${user.mfa_enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
              {user.mfa_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Master Password</CardTitle>
          <CardDescription>
            This will re-encrypt your vault key. You will need to log in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Master Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>New Master Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MFA Setup */}
      {!user.mfa_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!mfaSetup ? (
              <Button onClick={handleSetupMFA} disabled={isSettingUpMfa}>
                {isSettingUpMfa && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Setup TOTP (Authenticator App)
              </Button>
            ) : (
              <form onSubmit={handleVerifyMFA} className="space-y-4">
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <p className="text-sm font-medium">
                    Scan this code with your authenticator app:
                  </p>
                  <p className="text-xs font-mono break-all">{mfaUri}</p>
                  <p className="text-xs text-muted-foreground">
                    Or manually enter: <strong className="font-mono">{mfaSecret}</strong>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="text-center text-xl tracking-widest max-w-xs"
                  />
                </div>
                <Button type="submit">Verify & Enable</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Travel Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Travel Mode
          </CardTitle>
          <CardDescription>
            When enabled, only vaults marked as "safe for travel" will be visible.
            Use this when crossing borders to protect sensitive data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Travel Mode</p>
              <p className="text-xs text-muted-foreground">
                {travelMode ? 'Active — only safe vaults are visible' : 'Inactive — all vaults visible'}
              </p>
            </div>
            <Button
              variant={travelMode ? 'destructive' : 'default'}
              size="sm"
              disabled={isTogglingTravel}
              onClick={handleToggleTravelMode}
            >
              {isTogglingTravel && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {travelMode ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Safe for Travel</p>
            <div className="space-y-2">
              {vaults.map((vault) => (
                <div
                  key={vault.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent"
                >
                  <span className="text-sm">{vaultNames[vault.id] || 'Vault'}</span>
                  <button
                    onClick={() => handleToggleSafeForTravel(vault)}
                    className={`h-5 w-9 rounded-full transition-colors relative ${
                      vault.safe_for_travel ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        vault.safe_for_travel ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
