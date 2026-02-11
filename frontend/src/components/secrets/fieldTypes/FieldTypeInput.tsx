import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type CustomFieldType =
  | 'text'
  | 'url'
  | 'email'
  | 'password'
  | 'phone'
  | 'date'
  | 'address'
  | 'otp'
  | 'security_question'
  | 'section'
  | 'signin_with';

interface FieldTypeInputProps {
  type: CustomFieldType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function FieldTypeInput({ type, value, onChange, placeholder, readOnly }: FieldTypeInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  switch (type) {
    case 'password':
      return (
        <div className="flex gap-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Password'}
            readOnly={readOnly}
            className="font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      );

    case 'url':
      return (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'https://'}
          readOnly={readOnly}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'email@example.com'}
          readOnly={readOnly}
        />
      );

    case 'phone':
      return (
        <Input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '+1 (555) 000-0000'}
          readOnly={readOnly}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
        />
      );

    case 'address':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Street address...'}
          readOnly={readOnly}
          rows={2}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      );

    case 'otp':
      return (
        <Input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'One-time password secret'}
          readOnly={readOnly}
          className="font-mono tracking-wider"
        />
      );

    case 'security_question':
      return (
        <div className="space-y-2">
          <Input
            value={value.split('|||')[0] || ''}
            onChange={(e) => {
              const answer = value.split('|||')[1] || '';
              onChange(`${e.target.value}|||${answer}`);
            }}
            placeholder="Security question"
            readOnly={readOnly}
          />
          <Input
            value={value.split('|||')[1] || ''}
            onChange={(e) => {
              const question = value.split('|||')[0] || '';
              onChange(`${question}|||${e.target.value}`);
            }}
            placeholder="Answer"
            readOnly={readOnly}
          />
        </div>
      );

    case 'section':
      return (
        <div className="border-b pb-1 mb-2">
          <p className="text-sm font-semibold text-muted-foreground">{value || 'Section'}</p>
        </div>
      );

    case 'signin_with':
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'e.g., Sign in with Google'}
          readOnly={readOnly}
        />
      );

    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Enter value'}
          readOnly={readOnly}
        />
      );
  }
}
