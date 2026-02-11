import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { vaultAPI } from '@/api/client';
import { decrypt } from '@/crypto/encryption';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconPicker, getVaultIcon } from '@/components/vault/IconPicker';
import {
  Loader2,
  ArrowLeft,
  Save,
  Key,
  FileText,
  FolderOpen,
  Plane,
} from 'lucide-react';
import { encrypt } from '@/crypto/encryption';

interface VaultDetail {
  id: string;
  owner_id: string;
  org_id: string | null;
  name_encrypted: string;
  description_encrypted: string | null;
  icon: string;
  safe_for_travel: boolean;
  type: string;
  item_count: number;
  type_breakdown: Record<string, number>;
  folder_count: number;
  created_at: string;
  updated_at: string;
}

const typeLabels: Record<string, string> = {
  password: 'Passwords',
  login: 'Logins',
  secure_note: 'Secure Notes',
  credit_card: 'Credit Cards',
  identity: 'Identities',
  document: 'Documents',
  api_token: 'API Tokens',
  ssh_key: 'SSH Keys',
  certificate: 'Certificates',
  encryption_key: 'Encryption Keys',
  bank_account: 'Bank Accounts',
  crypto_wallet: 'Crypto Wallets',
  database: 'Databases',
  server: 'Servers',
  software_license: 'Software Licenses',
  wireless_router: 'Wireless Routers',
};

export function VaultDetailPage() {
  const { vaultId } = useParams<{ vaultId: string }>();
  const navigate = useNavigate();
  const vaultKey = useAuthStore((s) => s.vaultKey);

  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Decrypted editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('folder-lock');
  const [safeForTravel, setSafeForTravel] = useState(false);

  useEffect(() => {
    if (vaultId) loadVaultDetail();
  }, [vaultId]);

  const loadVaultDetail = async () => {
    if (!vaultKey || !vaultId) return;
    setIsLoading(true);
    try {
      const response = await vaultAPI.getDetails(vaultId);
      const data = response.data as VaultDetail;
      setVault(data);
      setIcon(data.icon || 'folder-lock');
      setSafeForTravel(data.safe_for_travel);

      // Decrypt name and description
      try {
        const decryptedName = await decrypt(data.name_encrypted, vaultKey);
        setName(decryptedName);
      } catch {
        setName('[Decryption Error]');
      }
      if (data.description_encrypted) {
        try {
          const decryptedDesc = await decrypt(data.description_encrypted, vaultKey);
          setDescription(decryptedDesc);
        } catch {
          setDescription('');
        }
      }
    } catch (err) {
      console.error('Failed to load vault details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vaultKey || !vaultId) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const nameEncrypted = await encrypt(name, vaultKey);
      const descEncrypted = description ? await encrypt(description, vaultKey) : undefined;

      await vaultAPI.update(vaultId, {
        name_encrypted: nameEncrypted,
        description_encrypted: descEncrypted,
        icon,
        safe_for_travel: safeForTravel,
      });

      setSaveMessage('Vault updated successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update vault:', err);
      setSaveMessage('Failed to update vault.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Vault not found.</p>
      </div>
    );
  }

  const VaultIcon = getVaultIcon(icon);
  const breakdownEntries = Object.entries(vault.type_breakdown).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vault')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <VaultIcon className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">{name || 'Vault Details'}</h1>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{vault.item_count}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{vault.folder_count}</p>
              <p className="text-xs text-muted-foreground">Folders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {Object.keys(vault.type_breakdown).length}
              </p>
              <p className="text-xs text-muted-foreground">Secret Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      {breakdownEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdownEntries.map(([type, count]) => {
                const total = vault.item_count || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm w-36 truncate">
                      {typeLabels[type] || type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Vault */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vault Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <div className="mt-1">
                <IconPicker value={icon} onChange={setIcon} />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="vault-name" className="text-xs text-muted-foreground">
                Vault Name
              </Label>
              <Input
                id="vault-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vault-desc" className="text-xs text-muted-foreground">
              Description
            </Label>
            <textarea
              id="vault-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
            />
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Safe for Travel</p>
                <p className="text-xs text-muted-foreground">
                  This vault will remain visible when Travel Mode is active
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSafeForTravel(!safeForTravel)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                safeForTravel ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  safeForTravel ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-muted-foreground">
            <div>
              <span className="text-xs">Type:</span>{' '}
              <span className="capitalize">{vault.type}</span>
            </div>
            <div>
              <span className="text-xs">Created:</span>{' '}
              {new Date(vault.created_at).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
        {saveMessage && (
          <span
            className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-destructive'}`}
          >
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
