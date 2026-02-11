import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function PassportFields({ values, onChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" value={values.firstName || ''} onChange={(e) => onChange('firstName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" value={values.lastName || ''} onChange={(e) => onChange('lastName', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="passportNumber">Passport Number</Label>
        <Input id="passportNumber" value={values.passportNumber || ''} onChange={(e) => onChange('passportNumber', e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issuingCountry">Issuing Country</Label>
        <Input id="issuingCountry" value={values.issuingCountry || ''} onChange={(e) => onChange('issuingCountry', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input id="issueDate" type="date" value={values.issueDate || ''} onChange={(e) => onChange('issueDate', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expirationDate">Expiration Date</Label>
          <Input id="expirationDate" type="date" value={values.expirationDate || ''} onChange={(e) => onChange('expirationDate', e.target.value)} />
        </div>
      </div>
    </>
  );
}
