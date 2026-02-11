import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function CreditCardFields({ values, onChange }: Props) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          placeholder="John Doe"
          value={values.cardholderName || ''}
          onChange={(e) => onChange('cardholderName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <Input
          id="cardNumber"
          placeholder="4111 1111 1111 1111"
          value={values.cardNumber || ''}
          onChange={(e) => onChange('cardNumber', e.target.value)}
          className="font-mono"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            id="expiryDate"
            placeholder="MM/YY"
            value={values.expiryDate || ''}
            onChange={(e) => onChange('expiryDate', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvv">CVV</Label>
          <Input
            id="cvv"
            placeholder="123"
            type="password"
            value={values.cvv || ''}
            onChange={(e) => onChange('cvv', e.target.value)}
            className="font-mono"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          placeholder="PIN"
          type="password"
          value={values.pin || ''}
          onChange={(e) => onChange('pin', e.target.value)}
          className="font-mono"
        />
      </div>
    </>
  );
}
