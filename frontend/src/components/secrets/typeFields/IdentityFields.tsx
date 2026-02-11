import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function IdentityFields({ values, onChange }: Props) {
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={values.email || ''} onChange={(e) => onChange('email', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={values.phone || ''} onChange={(e) => onChange('phone', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="birthDate">Date of Birth</Label>
        <Input id="birthDate" type="date" value={values.birthDate || ''} onChange={(e) => onChange('birthDate', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={values.address || ''} onChange={(e) => onChange('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={values.city || ''} onChange={(e) => onChange('city', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" value={values.state || ''} onChange={(e) => onChange('state', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP</Label>
          <Input id="zipCode" value={values.zipCode || ''} onChange={(e) => onChange('zipCode', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input id="country" value={values.country || ''} onChange={(e) => onChange('country', e.target.value)} />
      </div>
    </>
  );
}
