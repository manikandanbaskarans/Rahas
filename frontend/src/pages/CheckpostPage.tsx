import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { vaultAPI, secretsAPI, toolsAPI } from '@/api/client';
import { decryptSecretBundle } from '@/crypto/keyHierarchy';
import {
  calculateSecurityScore,
  checkBreachedPasswords,
  type SecurityScore,
} from '@/utils/securityScoring';
import { SecurityGauge } from '@/components/checkpost/SecurityGauge';
import { SecurityAlertCard } from '@/components/checkpost/SecurityAlertCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { DecryptedSecret, Vault, Secret } from '@/types';

export function CheckpostPage() {
  const navigate = useNavigate();
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const { vaults, setVaults } = useVaultStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingBreaches, setIsCheckingBreaches] = useState(false);
  const [allSecrets, setAllSecrets] = useState<DecryptedSecret[]>([]);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [breachCount, setBreachCount] = useState(0);

  const runSecurityScan = useCallback(async () => {
    if (!vaultKey) return;
    setIsLoading(true);

    try {
      // 1. Load all vaults
      const vaultResponse = await vaultAPI.list();
      const vaultList: Vault[] = vaultResponse.data.vaults;
      setVaults(vaultList);

      // 2. Load all secrets across all vaults and decrypt them
      const decrypted: DecryptedSecret[] = [];

      for (const vault of vaultList) {
        try {
          const secretsResponse = await secretsAPI.list(vault.id);
          const secrets: Secret[] = secretsResponse.data.secrets || [];

          for (const secret of secrets) {
            try {
              const { name, data, metadata } = await decryptSecretBundle(
                secret.name_encrypted,
                secret.data_encrypted,
                secret.encrypted_item_key,
                secret.metadata_encrypted,
                vaultKey
              );

              decrypted.push({
                id: secret.id,
                vault_id: secret.vault_id,
                folder_id: secret.folder_id,
                type: secret.type,
                name,
                data: JSON.parse(data),
                metadata,
                favorite: secret.favorite,
                is_archived: secret.is_archived,
                deleted_at: secret.deleted_at,
                created_at: secret.created_at,
                updated_at: secret.updated_at,
              });
            } catch {
              // Skip secrets that fail to decrypt
            }
          }
        } catch {
          // Skip vaults that fail to load
        }
      }

      setAllSecrets(decrypted);

      // 3. Calculate security score
      const score = calculateSecurityScore(decrypted);
      setSecurityScore(score);
    } catch (err) {
      console.error('Security scan failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [vaultKey, setVaults]);

  useEffect(() => {
    runSecurityScan();
  }, [runSecurityScan]);

  const handleBreachCheck = async () => {
    setIsCheckingBreaches(true);
    try {
      const breaches = await checkBreachedPasswords(allSecrets, async (hashPrefix) => {
        const response = await toolsAPI.checkBreach(hashPrefix);
        return response.data;
      });
      setBreachCount(breaches.length);

      // Merge breach results into security score
      if (securityScore) {
        const totalCheckable = Math.max(
          allSecrets.filter((s) => s.data.password).length,
          1
        );
        let adjusted = securityScore.overall;
        adjusted -= Math.min(10, (breaches.length / totalCheckable) * 10);
        adjusted = Math.max(0, Math.round(adjusted));

        let label = securityScore.label;
        let color = securityScore.color;
        if (adjusted >= 90) { label = 'Excellent'; color = '#16a34a'; }
        else if (adjusted >= 70) { label = 'Good'; color = '#22c55e'; }
        else if (adjusted >= 50) { label = 'Fair'; color = '#eab308'; }
        else if (adjusted >= 30) { label = 'Poor'; color = '#f97316'; }
        else { label = 'Critical'; color = '#ef4444'; }

        setSecurityScore({
          ...securityScore,
          overall: adjusted,
          label,
          color,
        });
      }
    } catch (err) {
      console.error('Breach check failed:', err);
    } finally {
      setIsCheckingBreaches(false);
    }
  };

  const navigateToSecret = (secretId: string) => {
    const secret = allSecrets.find((s) => s.id === secretId);
    if (secret) {
      navigate(`/vault`);
    }
  };

  const passwordSecrets = allSecrets.filter(
    (s) =>
      s.data.password &&
      ['password', 'login', 'api_token', 'server', 'database', 'email_account', 'wireless_router'].includes(s.type)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Running security scan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Checkpost</h1>
          <p className="text-muted-foreground mt-1">
            Zero-knowledge security analysis of your vault contents.
          </p>
        </div>
        <Button variant="outline" onClick={runSecurityScan}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-scan
        </Button>
      </div>

      {/* Score Gauge + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center relative">
            {securityScore && (
              <SecurityGauge
                score={securityScore.overall}
                label={securityScore.label}
                color={securityScore.color}
              />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{allSecrets.length}</p>
                <p className="text-sm text-muted-foreground">Total items scanned</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{passwordSecrets.length}</p>
                <p className="text-sm text-muted-foreground">Passwords checked</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{vaults.length}</p>
                <p className="text-sm text-muted-foreground">Vaults</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{breachCount}</p>
                <p className="text-sm text-muted-foreground">Breached passwords</p>
              </div>
            </div>

            {!isCheckingBreaches && breachCount === 0 && (
              <Button onClick={handleBreachCheck} className="w-full">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Check for Breached Passwords (HIBP)
              </Button>
            )}
            {isCheckingBreaches && (
              <Button disabled className="w-full">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking breaches...
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      {securityScore && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Security Findings</h2>

          <SecurityAlertCard
            title="Weak Passwords"
            severity={
              securityScore.weakPasswords.length === 0
                ? 'ok'
                : securityScore.weakPasswords.length > 3
                  ? 'critical'
                  : 'warning'
            }
            count={securityScore.weakPasswords.length}
            total={passwordSecrets.length}
            issues={securityScore.weakPasswords}
            onAction={navigateToSecret}
            actionLabel="View"
          />

          <SecurityAlertCard
            title="Reused Passwords"
            severity={
              securityScore.reusedPasswords.length === 0
                ? 'ok'
                : securityScore.reusedPasswords.length > 4
                  ? 'critical'
                  : 'warning'
            }
            count={securityScore.reusedPasswords.length}
            total={passwordSecrets.length}
            issues={securityScore.reusedPasswords}
            onAction={navigateToSecret}
            actionLabel="View"
          />

          <SecurityAlertCard
            title="Unsecured URLs (HTTP)"
            severity={
              securityScore.unsecuredUrls.length === 0 ? 'ok' : 'info'
            }
            count={securityScore.unsecuredUrls.length}
            total={allSecrets.length}
            issues={securityScore.unsecuredUrls}
            onAction={navigateToSecret}
            actionLabel="View"
          />

          <SecurityAlertCard
            title="Old Passwords (90+ days)"
            severity={
              securityScore.oldPasswords.length === 0
                ? 'ok'
                : securityScore.oldPasswords.length > 5
                  ? 'warning'
                  : 'info'
            }
            count={securityScore.oldPasswords.length}
            total={passwordSecrets.length}
            issues={securityScore.oldPasswords}
            onAction={navigateToSecret}
            actionLabel="View"
          />
        </div>
      )}
    </div>
  );
}
