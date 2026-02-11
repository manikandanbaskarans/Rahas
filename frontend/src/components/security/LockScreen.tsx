import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { deriveKeys } from '@/crypto/keyDerivation';
import { decryptVaultKey } from '@/crypto/keyHierarchy';
import { decryptPrivateKey } from '@/crypto/sharing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';

export function LockScreen() {
  const { user, setMasterKey, setVaultKey, setPrivateKey } = useAuthStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { masterKey } = await deriveKeys(
        password,
        user.email,
        user.kdf_memory,
        user.kdf_iterations
      );

      const vaultKey = await decryptVaultKey(user.encrypted_vault_key, masterKey);
      setMasterKey(masterKey);
      setVaultKey(vaultKey);

      if (user.encrypted_private_key) {
        const privKey = await decryptPrivateKey(user.encrypted_private_key, masterKey);
        setPrivateKey(privKey);
      }

      setPassword('');
    } catch {
      setError('Invalid master password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Vault Locked</CardTitle>
          <CardDescription>
            Your vault has been locked due to inactivity.
            Enter your master password to unlock.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUnlock}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="text-center text-sm text-muted-foreground">
              Signed in as <strong>{user.email}</strong>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Master Password</Label>
              <Input
                id="unlock-password"
                type="password"
                placeholder="Enter master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Unlocking...' : 'Unlock Vault'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
