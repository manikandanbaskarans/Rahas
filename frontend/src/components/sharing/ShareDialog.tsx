import React, { useState } from 'react';
import type { DecryptedSecret } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { sharingAPI } from '@/api/client';
import { decryptItemKey } from '@/crypto/keyHierarchy';
import { importPublicKey, encryptItemKeyForRecipient } from '@/crypto/sharing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Share2, X } from 'lucide-react';

interface ShareDialogProps {
  secret: DecryptedSecret;
  encryptedItemKey: string;
  onClose: () => void;
}

export function ShareDialog({ secret, encryptedItemKey, onClose }: ShareDialogProps) {
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultKey) return;
    setError('');
    setIsLoading(true);

    try {
      // Decrypt the item key
      const itemKey = await decryptItemKey(encryptedItemKey, vaultKey);

      // Import recipient's public key and encrypt item key for them
      const pubKey = await importPublicKey(recipientPublicKey);
      const encryptedForRecipient = await encryptItemKeyForRecipient(itemKey, pubKey);

      await sharingAPI.share(secret.id, {
        shared_with_user_id: recipientUserId || undefined,
        encrypted_item_key_for_recipient: encryptedForRecipient,
        permission,
      });

      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to share secret');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Share2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Secret Shared Successfully</h3>
          <p className="text-sm text-muted-foreground mb-4">
            "{secret.name}" has been securely shared.
          </p>
          <Button onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Share "{secret.name}"</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <form onSubmit={handleShare}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            Sharing uses end-to-end encryption. The recipient's public key is used
            to encrypt the secret's key - only they can decrypt it.
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-id">Recipient User ID</Label>
            <Input
              id="recipient-id"
              placeholder="User UUID"
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-key">Recipient's Public Key</Label>
            <textarea
              id="recipient-key"
              placeholder="Paste recipient's public key (Base64)"
              value={recipientPublicKey}
              onChange={(e) => setRecipientPublicKey(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Permission</Label>
            <div className="flex gap-2">
              {(['read', 'write'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPermission(p)}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    permission === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-input'
                  }`}
                >
                  {p === 'read' ? 'Read Only' : 'Read & Write'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Share2 className="h-4 w-4 mr-2" />
            Share Secret
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
