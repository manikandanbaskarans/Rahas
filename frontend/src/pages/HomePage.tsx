import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { vaultAPI } from '@/api/client';
import { encrypt } from '@/crypto/encryption';
import { VaultCard } from '@/components/dashboard/VaultCard';
import { OnboardingCarousel } from '@/components/dashboard/OnboardingCarousel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Shield, Key, FolderLock, Loader2 } from 'lucide-react';
import type { Vault } from '@/types';

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const { vaults, setVaults } = useVaultStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [creatingVault, setCreatingVault] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await vaultAPI.list();
      const vaultList: Vault[] = response.data.vaults;
      setVaults(vaultList);
      if (vaultList.length === 0) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVault = async () => {
    if (!vaultKey || !newVaultName.trim()) return;
    try {
      const nameEncrypted = await encrypt(newVaultName, vaultKey);
      const response = await vaultAPI.create({
        name_encrypted: nameEncrypted,
        type: 'personal',
      });
      setVaults([...vaults, response.data]);
      setNewVaultName('');
      setCreatingVault(false);
      setShowOnboarding(false);
    } catch (err) {
      console.error('Failed to create vault:', err);
    }
  };

  const totalItems = vaults.reduce((sum, v) => sum + (v.item_count ?? 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your vault is secure. You have {totalItems} item{totalItems !== 1 ? 's' : ''} across {vaults.length} vault{vaults.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button onClick={() => setCreatingVault(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Vault
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FolderLock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vaults.length}</p>
              <p className="text-xs text-muted-foreground">Vaults</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{user?.mfa_enabled ? 'On' : 'Off'}</p>
              <p className="text-xs text-muted-foreground">MFA Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingCarousel onDismiss={() => setShowOnboarding(false)} />
      )}

      {/* Create Vault */}
      {creatingVault && (
        <Card>
          <CardContent className="p-4 flex gap-2">
            <Input
              placeholder="New vault name"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateVault()}
              autoFocus
            />
            <Button onClick={handleCreateVault}>Create</Button>
            <Button variant="outline" onClick={() => setCreatingVault(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      {/* Vault Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Your Vaults</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : vaults.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderLock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No vaults yet. Create one to get started.</p>
              <Button onClick={() => setCreatingVault(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Vault
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
