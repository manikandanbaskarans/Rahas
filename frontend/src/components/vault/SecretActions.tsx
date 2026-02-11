import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { secretsAPI } from '@/api/client';
import { encryptItemKey } from '@/crypto/keyHierarchy';
import { encrypt } from '@/crypto/encryption';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MoreVertical,
  Move,
  Copy,
  Link2,
  History,
  Archive,
  Trash2,
} from 'lucide-react';
import type { DecryptedSecret, Vault } from '@/types';

interface SecretActionsProps {
  secret: DecryptedSecret;
  onArchive?: () => void;
  onDelete?: () => void;
  onShareLink?: () => void;
  onRefresh?: () => void;
}

export function SecretActions({
  secret,
  onArchive,
  onDelete,
  onShareLink,
  onRefresh,
}: SecretActionsProps) {
  const [open, setOpen] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sharingHistory, setSharingHistory] = useState<unknown[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const vaultKey = useAuthStore((s) => s.vaultKey);
  const vaults = useVaultStore((s) => s.vaults);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleDuplicate = async () => {
    if (!vaultKey) return;
    setOpen(false);
    try {
      // Generate a new item key encrypted with the same vault key
      const { generateItemKey } = await import('@/crypto/keyHierarchy');
      const newItemKey = await generateItemKey();
      const encryptedItemKey = await encryptItemKey(newItemKey, vaultKey);
      const nameEncrypted = await encrypt(`${secret.name} (Copy)`, vaultKey);

      await secretsAPI.duplicate(secret.id, {
        name_encrypted: nameEncrypted,
        encrypted_item_key: encryptedItemKey,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleMove = async (targetVault: Vault) => {
    if (!vaultKey) return;
    setShowMoveDialog(false);
    setOpen(false);
    try {
      const { generateItemKey } = await import('@/crypto/keyHierarchy');
      const newItemKey = await generateItemKey();
      const encryptedItemKey = await encryptItemKey(newItemKey, vaultKey);

      await secretsAPI.move(secret.id, {
        target_vault_id: targetVault.id,
        encrypted_item_key: encryptedItemKey,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to move:', err);
    }
  };

  const handleCopyLink = () => {
    setOpen(false);
    const link = `${window.location.origin}/vault?secret=${secret.id}`;
    navigator.clipboard.writeText(link);
  };

  const handleViewHistory = async () => {
    setOpen(false);
    try {
      const response = await secretsAPI.sharingHistory(secret.id);
      setSharingHistory(response.data);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load sharing history:', err);
    }
  };

  const menuItems = [
    { icon: Move, label: 'Move to Vault', onClick: () => { setOpen(false); setShowMoveDialog(true); } },
    { icon: Copy, label: 'Duplicate', onClick: handleDuplicate },
    { icon: Link2, label: 'Copy Private Link', onClick: handleCopyLink },
    { icon: History, label: 'Sharing History', onClick: handleViewHistory },
    ...(onShareLink ? [{ icon: Link2, label: 'Create Share Link', onClick: () => { setOpen(false); onShareLink(); } }] : []),
    ...(onArchive ? [{ icon: Archive, label: 'Archive', onClick: () => { setOpen(false); onArchive(); } }] : []),
    ...(onDelete ? [{ icon: Trash2, label: 'Delete', onClick: () => { setOpen(false); onDelete(); }, danger: true }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
        <MoreVertical className="h-4 w-4" />
      </Button>

      {open && (
        <Card className="absolute right-0 top-full mt-1 w-52 z-50 shadow-lg">
          <CardContent className="p-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    'danger' in item && item.danger
                      ? 'text-red-500 hover:bg-red-50'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Move dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-96">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Move to Vault</h3>
              <p className="text-sm text-muted-foreground">
                Select the target vault for "{secret.name}".
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vaults
                  .filter((v) => v.id !== secret.vault_id)
                  .map((vault) => (
                    <button
                      key={vault.id}
                      onClick={() => handleMove(vault)}
                      className="w-full text-left p-3 rounded-md hover:bg-accent text-sm"
                    >
                      {vault.name_encrypted.substring(0, 30)}...
                    </button>
                  ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowMoveDialog(false)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sharing history dialog */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-96">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Sharing History</h3>
              {sharingHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sharing history.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sharingHistory.map((entry: unknown, i) => {
                    const share = entry as Record<string, unknown>;
                    return (
                      <div key={i} className="p-2 border rounded text-xs">
                        <p>Permission: {String(share.permission)}</p>
                        <p className="text-muted-foreground">
                          {new Date(String(share.created_at)).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setShowHistory(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
