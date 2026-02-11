import { useState, useEffect } from 'react';
import { toolsAPI } from '@/api/client';
import { secureCopy } from '@/crypto/memoryGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, RefreshCw } from 'lucide-react';

export function PasswordGenerator() {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(20);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [strength, setStrength] = useState(0);
  const [entropy, setEntropy] = useState(0);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    try {
      const response = await toolsAPI.generatePassword({
        length,
        include_uppercase: includeUppercase,
        include_lowercase: includeLowercase,
        include_numbers: includeNumbers,
        include_symbols: includeSymbols,
        exclude_ambiguous: excludeAmbiguous,
      });
      setPassword(response.data.password);
      setStrength(response.data.strength_score);
      setEntropy(response.data.entropy_bits);
    } catch {
      // Generate locally as fallback
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let result = '';
      const array = new Uint32Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
      setPassword(result);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  const handleCopy = async () => {
    const success = await secureCopy(password);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Password Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={password}
                readOnly
                className="font-mono text-lg"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={generate}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          i <= strength ? strengthColors[strength] : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                  <span className="text-muted-foreground">
                    {entropy.toFixed(0)} bits of entropy
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Length: {length}</Label>
              </div>
              <input
                type="range"
                min={8}
                max={128}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>8</span>
                <span>128</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Uppercase (A-Z)', checked: includeUppercase, set: setIncludeUppercase },
                { label: 'Lowercase (a-z)', checked: includeLowercase, set: setIncludeLowercase },
                { label: 'Numbers (0-9)', checked: includeNumbers, set: setIncludeNumbers },
                { label: 'Symbols (!@#$)', checked: includeSymbols, set: setIncludeSymbols },
                { label: 'Exclude Ambiguous', checked: excludeAmbiguous, set: setExcludeAmbiguous },
              ].map(({ label, checked, set }) => (
                <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => set(e.target.checked)}
                    className="rounded border-input"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={generate} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate New Password
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Copied passwords are automatically cleared from clipboard after 30 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
