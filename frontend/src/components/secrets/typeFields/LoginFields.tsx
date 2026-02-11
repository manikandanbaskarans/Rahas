import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { evaluatePasswordStrength } from '@/utils/passwordStrength';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onGeneratePassword?: () => void;
}

export function LoginFields({ values, onChange, onGeneratePassword }: Props) {
  const strength = evaluatePasswordStrength(values.password || '');

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="username">Username / Email</Label>
        <Input
          id="username"
          placeholder="username or email"
          value={values.username || ''}
          onChange={(e) => onChange('username', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            type="text"
            placeholder="Password"
            value={values.password || ''}
            onChange={(e) => onChange('password', e.target.value)}
            className="font-mono"
          />
          {onGeneratePassword && (
            <Button type="button" variant="outline" onClick={onGeneratePassword}>
              <Wand2 className="h-4 w-4 mr-1" />
              Generate
            </Button>
          )}
        </div>
        {values.password && (
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full"
                style={{
                  backgroundColor: i <= strength.score ? strength.color : '#e5e7eb',
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          placeholder="https://..."
          value={values.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
        />
      </div>
    </>
  );
}
