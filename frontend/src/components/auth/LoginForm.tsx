import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { authAPI } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { deriveKeys } from '@/crypto/keyDerivation';
import { decryptVaultKey } from '@/crypto/keyHierarchy';
import { decryptPrivateKey } from '@/crypto/sharing';

export function LoginForm() {
  const navigate = useNavigate();
  const { setUser, setTokens, setMasterKey, setVaultKey, setPrivateKey } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Derive keys client-side
      const { authKey, masterKey } = await deriveKeys(password, email);

      const response = await authAPI.login({ email, auth_key: authKey });
      const data = response.data;

      if (data.requires_mfa) {
        setMfaSession(data.mfa_session_token);
        setIsLoading(false);
        return;
      }

      // Set tokens
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      setMasterKey(masterKey);

      // Decrypt vault key
      const vaultKey = await decryptVaultKey(data.user.encrypted_vault_key, masterKey);
      setVaultKey(vaultKey);

      // Decrypt private key if available
      if (data.user.encrypted_private_key) {
        const privKey = await decryptPrivateKey(data.user.encrypted_private_key, masterKey);
        setPrivateKey(privKey);
      }

      navigate('/vault');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaSession) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.mfaVerify({
        mfa_session_token: mfaSession,
        code: mfaCode,
      });
      const data = response.data;

      const { masterKey } = await deriveKeys(password, email);

      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      setMasterKey(masterKey);

      const vaultKey = await decryptVaultKey(data.user.encrypted_vault_key, masterKey);
      setVaultKey(vaultKey);

      if (data.user.encrypted_private_key) {
        const privKey = await decryptPrivateKey(data.user.encrypted_private_key, masterKey);
        setPrivateKey(privKey);
      }

      navigate('/vault');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'MFA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (mfaSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Enter the code from your authenticator app</CardDescription>
          </CardHeader>
          <form onSubmit={handleMFAVerify}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Authentication Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Welcome to VaultKeeper</CardTitle>
          <CardDescription>Sign in to access your encrypted vault</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Master Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Deriving keys...' : 'Sign In'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
