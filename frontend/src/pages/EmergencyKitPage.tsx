import { useAuthStore } from '@/store/authStore';
import { downloadEmergencyKit } from '@/utils/emergencyKit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileDown, Shield, AlertTriangle, Printer } from 'lucide-react';

export function EmergencyKitPage() {
  const user = useAuthStore((s) => s.user);

  const handleDownload = () => {
    if (!user) return;

    downloadEmergencyKit({
      email: user.email,
      name: user.name,
      signInUrl: window.location.origin + '/login',
      kdfIterations: user.kdf_iterations,
      kdfMemory: user.kdf_memory,
      createdAt: new Date().toLocaleDateString(),
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Emergency Kit</h1>
          <p className="text-muted-foreground mt-1">
            Your safety net for account recovery.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Why do you need an Emergency Kit?</p>
              <p className="text-sm text-muted-foreground mt-1">
                VaultKeeper uses zero-knowledge encryption. This means we cannot reset your
                master password or recover your account if you forget it. Your Emergency Kit
                is the only way to recover access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">What's included?</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Sign-in URL</strong> — The web address to access your vault</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Email address</strong> — Your account identifier</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>KDF parameters</strong> — Key derivation settings for your account</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Blank password field</strong> — Space to write your master password by hand</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">How to use it</h2>
          <ol className="space-y-2 text-sm list-decimal list-inside">
            <li>Download and print the Emergency Kit</li>
            <li>Write your master password by hand in the designated space</li>
            <li>Store it in a secure physical location (safe, safety deposit box)</li>
            <li>Do NOT store it digitally or share it with anyone</li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleDownload} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Print Emergency Kit
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <FileDown className="h-4 w-4 mr-2" />
          Download as HTML
        </Button>
      </div>
    </div>
  );
}
