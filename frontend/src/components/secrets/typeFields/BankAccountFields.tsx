import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function BankAccountFields({ values, onChange }: Props) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="bankName">Bank Name</Label>
        <Input id="bankName" value={values.bankName || ''} onChange={(e) => onChange('bankName', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountNumber">Account Number</Label>
        <Input id="accountNumber" value={values.accountNumber || ''} onChange={(e) => onChange('accountNumber', e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="routingNumber">Routing Number</Label>
        <Input id="routingNumber" value={values.routingNumber || ''} onChange={(e) => onChange('routingNumber', e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountType">Account Type</Label>
        <Input id="accountType" placeholder="Checking / Savings" value={values.accountType || ''} onChange={(e) => onChange('accountType', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="swiftCode">SWIFT Code</Label>
          <Input id="swiftCode" value={values.swiftCode || ''} onChange={(e) => onChange('swiftCode', e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ibanNumber">IBAN</Label>
          <Input id="ibanNumber" value={values.ibanNumber || ''} onChange={(e) => onChange('ibanNumber', e.target.value)} className="font-mono" />
        </div>
      </div>
    </>
  );
}
