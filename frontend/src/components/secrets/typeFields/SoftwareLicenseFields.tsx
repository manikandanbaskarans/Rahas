import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function SoftwareLicenseFields({ values, onChange }: Props) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="licenseKey">License Key</Label>
        <Input id="licenseKey" value={values.licenseKey || ''} onChange={(e) => onChange('licenseKey', e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="version">Version</Label>
        <Input id="version" placeholder="1.0.0" value={values.version || ''} onChange={(e) => onChange('version', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Registered Email</Label>
        <Input id="email" type="email" value={values.email || ''} onChange={(e) => onChange('email', e.target.value)} />
      </div>
    </>
  );
}
