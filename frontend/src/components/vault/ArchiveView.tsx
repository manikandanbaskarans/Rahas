import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { secretsAPI } from '@/api/client';
import { decryptSecretBundle } from '@/crypto/keyHierarchy';
import type { Secret, DecryptedSecret } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Archive, ArchiveRestore, Trash2, Loader2, Key } from 'lucide-react';

export function ArchiveView() {
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const [secrets, setSecrets] = useState<DecryptedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArchived = useCallback(async () => {
    if (!vaultKey) return;
    setIsLoading(true);
    try {
      const response = await secretsAPI.listArchived();
      const encrypted: Secret[] = response.data;
      const decrypted = await Promise.all(
        encrypted.map(async (secret) => {
          try {
            const { name, data, metadata } = await decryptSecretBundle(
              secret.name_encrypted, secret.data_encrypted,
              secret.encrypted_item_key, secret.metadata_encrypted, vaultKey
            );
            return {
              id: secret.id, vault_id: secret.vault_id, folder_id: secret.folder_id,
              type: secret.type, name, data: JSON.parse(data), metadata,
              favorite: secret.favorite, is_archived: true,
              created_at: secret.created_at, updated_at: secret.updated_at,
            } as DecryptedSecret;
          } catch {
            return {
              id: secret.id, vault_id: secret.vault_id, folder_id: secret.folder_id,
              type: secret.type, name: '[Decryption Error]', data: {}, metadata: null,
              favorite: false, is_archived: true,
              created_at: secret.created_at, updated_at: secret.updated_at,
            } as DecryptedSecret;
          }
        })
      );
      setSecrets(decrypted);
    } catch (err) {
      console.error('Failed to load archived secrets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [vaultKey]);

  useEffect(() => {
    loadArchived();
  }, [loadArchived]);

  const handleUnarchive = async (id: string) => {
    try {
      await secretsAPI.unarchive(id);
      setSecrets(secrets.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to unarchive:', err);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await secretsAPI.permanentDelete(id);
      setSecrets(secrets.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to permanently delete:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Archive className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Archive</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : secrets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No archived items</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {secrets.map((secret) => (
            <Card key={secret.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{secret.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {secret.type.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleUnarchive(secret.id)}>
                    <ArchiveRestore className="h-4 w-4 mr-1" />
                    Unarchive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handlePermanentDelete(secret.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
