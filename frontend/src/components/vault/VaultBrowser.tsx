import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { vaultAPI, secretsAPI } from '@/api/client';
import { decryptSecretBundle } from '@/crypto/keyHierarchy';
import { encrypt } from '@/crypto/encryption';
import type { Secret, DecryptedSecret } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  FolderLock,
  Key,
  FileText,
  Globe,
  Star,
  Loader2,
  CreditCard,
  User,
  Landmark,
  Server,
  Database,
  Wifi,
  Mail,
  Shield,
  IdCard,
} from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  password: <Key className="h-4 w-4" />,
  login: <Key className="h-4 w-4" />,
  api_token: <Globe className="h-4 w-4" />,
  secure_note: <FileText className="h-4 w-4" />,
  ssh_key: <Key className="h-4 w-4" />,
  certificate: <FileText className="h-4 w-4" />,
  encryption_key: <Key className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  identity: <User className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  bank_account: <Landmark className="h-4 w-4" />,
  crypto_wallet: <Shield className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  driver_license: <IdCard className="h-4 w-4" />,
  email_account: <Mail className="h-4 w-4" />,
  medical_record: <FileText className="h-4 w-4" />,
  membership: <IdCard className="h-4 w-4" />,
  outdoor_license: <IdCard className="h-4 w-4" />,
  passport: <IdCard className="h-4 w-4" />,
  rewards: <Star className="h-4 w-4" />,
  server: <Server className="h-4 w-4" />,
  social_security_number: <Shield className="h-4 w-4" />,
  software_license: <Key className="h-4 w-4" />,
  wireless_router: <Wifi className="h-4 w-4" />,
};

interface VaultBrowserProps {
  onAddSecret: () => void;
  onSelectSecret: (secret: DecryptedSecret) => void;
}

export function VaultBrowser({ onAddSecret, onSelectSecret }: VaultBrowserProps) {
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const {
    vaults,
    setVaults,
    currentVault,
    setCurrentVault,
    secrets,
    setSecrets,
    searchQuery,
    setSearchQuery,
    isLoading,
    setLoading,
  } = useVaultStore();

  const [creatingVault, setCreatingVault] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');

  const loadVaults = useCallback(async () => {
    try {
      const response = await vaultAPI.list();
      setVaults(response.data.vaults);
      if (response.data.vaults.length > 0 && !currentVault) {
        setCurrentVault(response.data.vaults[0]);
      }
    } catch (err) {
      console.error('Failed to load vaults:', err);
    }
  }, [setVaults, setCurrentVault, currentVault]);

  const loadSecrets = useCallback(async (vaultId: string) => {
    if (!vaultKey) return;
    setLoading(true);

    try {
      const response = await secretsAPI.list(vaultId);
      const encrypted: Secret[] = response.data.secrets;

      const decrypted: DecryptedSecret[] = await Promise.all(
        encrypted.map(async (secret) => {
          try {
            const { name, data, metadata } = await decryptSecretBundle(
              secret.name_encrypted,
              secret.data_encrypted,
              secret.encrypted_item_key,
              secret.metadata_encrypted,
              vaultKey
            );
            return {
              id: secret.id,
              vault_id: secret.vault_id,
              folder_id: secret.folder_id,
              type: secret.type,
              name,
              data: JSON.parse(data),
              metadata,
              favorite: secret.favorite,
              created_at: secret.created_at,
              updated_at: secret.updated_at,
            };
          } catch {
            return {
              id: secret.id,
              vault_id: secret.vault_id,
              folder_id: secret.folder_id,
              type: secret.type,
              name: '[Decryption Error]',
              data: {},
              metadata: null,
              favorite: secret.favorite,
              created_at: secret.created_at,
              updated_at: secret.updated_at,
            };
          }
        })
      );

      setSecrets(decrypted);
    } catch (err) {
      console.error('Failed to load secrets:', err);
    } finally {
      setLoading(false);
    }
  }, [vaultKey, setLoading, setSecrets]);

  useEffect(() => {
    loadVaults();
  }, [loadVaults]);

  useEffect(() => {
    if (currentVault && vaultKey) {
      loadSecrets(currentVault.id);
    }
  }, [currentVault, vaultKey, loadSecrets]);

  const handleCreateVault = async () => {
    if (!vaultKey || !newVaultName.trim()) return;

    try {
      const nameEncrypted = await encrypt(newVaultName, vaultKey);
      const response = await vaultAPI.create({
        name_encrypted: nameEncrypted,
        type: 'personal',
      });
      setVaults([...vaults, response.data]);
      setCurrentVault(response.data);
      setNewVaultName('');
      setCreatingVault(false);
    } catch (err) {
      console.error('Failed to create vault:', err);
    }
  };

  const filteredSecrets = secrets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favorites = filteredSecrets.filter((s) => s.favorite);
  const others = filteredSecrets.filter((s) => !s.favorite);

  return (
    <div className="flex h-full">
      {/* Vault Sidebar */}
      <div className="w-56 border-r p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Vaults</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCreatingVault(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {creatingVault && (
          <div className="space-y-2">
            <Input
              placeholder="Vault name"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateVault()}
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" className="flex-1" onClick={handleCreateVault}>
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreatingVault(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {vaults.map((vault) => (
            <button
              key={vault.id}
              onClick={() => setCurrentVault(vault)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                currentVault?.id === vault.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <FolderLock className="h-4 w-4" />
              <span className="truncate">{vault.name_encrypted.substring(0, 20)}...</span>
            </button>
          ))}
        </div>
      </div>

      {/* Secret List */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Secrets</h2>
          <Button onClick={onAddSecret}>
            <Plus className="h-4 w-4 mr-2" />
            Add Secret
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search secrets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSecrets.length === 0 ? (
          <div className="text-center py-20">
            <FolderLock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No secrets yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first password or secret to get started
            </p>
            <Button onClick={onAddSecret}>
              <Plus className="h-4 w-4 mr-2" />
              Add Secret
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Star className="h-3 w-3" /> Favorites
                </h3>
                <div className="space-y-1">
                  {favorites.map((secret) => (
                    <SecretRow
                      key={secret.id}
                      secret={secret}
                      onClick={() => onSelectSecret(secret)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              {favorites.length > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-2">All Items</h3>
              )}
              <div className="space-y-1">
                {others.map((secret) => (
                  <SecretRow
                    key={secret.id}
                    secret={secret}
                    onClick={() => onSelectSecret(secret)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SecretRow({
  secret,
  onClick,
}: {
  secret: DecryptedSecret;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {typeIcons[secret.type] || <Key className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{secret.name}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {secret.type.replace('_', ' ')}
          {secret.data.username && ` - ${secret.data.username}`}
        </p>
      </div>
      {secret.favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
    </button>
  );
}
