import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function DatabaseFields({ values, onChange }: Props) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="hostname">Hostname</Label>
        <Input id="hostname" placeholder="localhost" value={values.hostname || ''} onChange={(e) => onChange('hostname', e.target.value)} className="font-mono" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input id="port" placeholder="5432" value={values.port || ''} onChange={(e) => onChange('port', e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="databaseName">Database Name</Label>
          <Input id="databaseName" value={values.databaseName || ''} onChange={(e) => onChange('databaseName', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={values.username || ''} onChange={(e) => onChange('username', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="text" value={values.password || ''} onChange={(e) => onChange('password', e.target.value)} className="font-mono" />
      </div>
    </>
  );
}
