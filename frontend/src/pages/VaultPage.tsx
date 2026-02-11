import { useState } from 'react';
import { VaultBrowser } from '@/components/vault/VaultBrowser';
import { SecretDetail } from '@/components/secrets/SecretDetail';
import { AddSecretForm } from '@/components/secrets/AddSecretForm';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { useVaultStore } from '@/store/vaultStore';
import { secretsAPI } from '@/api/client';
import type { DecryptedSecret } from '@/types';

type ViewMode = 'browse' | 'add' | 'detail' | 'share';

export function VaultPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const { selectedSecret, setSelectedSecret, addSecret, removeSecret, updateSecret } =
    useVaultStore();
  const [shareSecret, setShareSecret] = useState<DecryptedSecret | null>(null);

  const handleSelectSecret = (secret: DecryptedSecret) => {
    setSelectedSecret(secret);
    setViewMode('detail');
  };

  const handleAddSecret = () => {
    setViewMode('add');
  };

  const handleSecretAdded = (secret: DecryptedSecret) => {
    addSecret(secret);
    setViewMode('browse');
  };

  const handleDeleteSecret = async (id: string) => {
    try {
      await secretsAPI.delete(id);
      removeSecret(id);
      setViewMode('browse');
    } catch {
      console.error('Failed to delete secret');
    }
  };

  const handleToggleFavorite = async (id: string, favorite: boolean) => {
    try {
      await secretsAPI.update(id, { favorite });
      updateSecret(id, { favorite });
    } catch {
      console.error('Failed to update favorite');
    }
  };

  const handleShareSecret = (secret: DecryptedSecret) => {
    setShareSecret(secret);
    setViewMode('share');
  };

  return (
    <div className="flex h-full">
      <div className={viewMode === 'browse' ? 'flex-1' : 'flex-1 max-w-[60%]'}>
        <VaultBrowser
          onAddSecret={handleAddSecret}
          onSelectSecret={handleSelectSecret}
        />
      </div>

      {viewMode === 'detail' && selectedSecret && (
        <div className="w-[400px] border-l overflow-auto">
          <SecretDetail
            secret={selectedSecret}
            onClose={() => setViewMode('browse')}
            onDelete={handleDeleteSecret}
            onShare={handleShareSecret}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      )}

      {viewMode === 'add' && (
        <div className="w-[450px] border-l overflow-auto p-4">
          <AddSecretForm
            onClose={() => setViewMode('browse')}
            onAdded={handleSecretAdded}
          />
        </div>
      )}

      {viewMode === 'share' && shareSecret && (
        <div className="w-[450px] border-l overflow-auto p-4">
          <ShareDialog
            secret={shareSecret}
            encryptedItemKey=""
            onClose={() => {
              setShareSecret(null);
              setViewMode('detail');
            }}
          />
        </div>
      )}
    </div>
  );
}
