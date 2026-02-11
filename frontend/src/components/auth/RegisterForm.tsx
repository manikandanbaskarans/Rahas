import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { authAPI } from '@/api/client';
import { deriveKeys } from '@/crypto/keyDerivation';
import { generateVaultKey, encryptVaultKey } from '@/crypto/keyHierarchy';
import { generateKeyPair, encryptPrivateKey } from '@/crypto/sharing';
import { evaluatePasswordStrength } from '@/utils/passwordStrength';

export function RegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Master password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Derive auth key and master key from password
      const { authKey, masterKey } = await deriveKeys(password, email);

      // 2. Generate vault key and encrypt with master key
      const vaultKey = await generateVaultKey();
      const encryptedVaultKey = await encryptVaultKey(vaultKey, masterKey);

      // 3. Generate RSA key pair for sharing
      const { publicKey, privateKeyEncoded } = await generateKeyPair();
      const encryptedPrivateKey = await encryptPrivateKey(privateKeyEncoded, masterKey);

      // 4. Register with server
      await authAPI.register({
        email,
        name,
        auth_key: authKey,
        encrypted_vault_key: encryptedVaultKey,
        encrypted_private_key: encryptedPrivateKey,
        public_key: publicKey,
        kdf_iterations: 3,
        kdf_memory: 65536,
      });

      navigate('/login');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Create Your Vault</CardTitle>
          <CardDescription>
            Set up your zero-knowledge encrypted vault
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Your master password cannot be recovered. VaultKeeper uses zero-knowledge
                encryption - we never see your password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Master Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Choose a strong master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i <= strength.score ? strength.color : '#e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                  {strength.feedback.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {strength.feedback.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Master Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating vault...' : 'Create Account'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
