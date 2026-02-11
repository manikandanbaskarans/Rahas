import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function WirelessRouterFields({ values, onChange }: Props) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="ssid">SSID (Network Name)</Label>
        <Input id="ssid" value={values.ssid || ''} onChange={(e) => onChange('ssid', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="text" value={values.password || ''} onChange={(e) => onChange('password', e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="encryptionType">Encryption Type</Label>
        <Input id="encryptionType" placeholder="WPA2, WPA3, etc." value={values.encryptionType || ''} onChange={(e) => onChange('encryptionType', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hostname">Router IP</Label>
        <Input id="hostname" placeholder="192.168.1.1" value={values.hostname || ''} onChange={(e) => onChange('hostname', e.target.value)} className="font-mono" />
      </div>
    </>
  );
}
