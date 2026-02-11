import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SecretType } from '@/types';

interface Props {
  type: SecretType;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const typeFieldConfig: Record<string, { label: string; key: string; mono?: boolean }[]> = {
  crypto_wallet: [
    { label: 'Wallet Address', key: 'walletAddress', mono: true },
    { label: 'Seed Phrase', key: 'seedPhrase', mono: true },
    { label: 'Password', key: 'password', mono: true },
  ],
  driver_license: [
    { label: 'License Number', key: 'licenseNumber', mono: true },
    { label: 'First Name', key: 'firstName' },
    { label: 'Last Name', key: 'lastName' },
    { label: 'Expiration Date', key: 'expirationDate' },
    { label: 'State / Province', key: 'state' },
  ],
  email_account: [
    { label: 'Email Address', key: 'email' },
    { label: 'Password', key: 'password', mono: true },
    { label: 'SMTP Server', key: 'hostname' },
    { label: 'Port', key: 'port', mono: true },
  ],
  medical_record: [
    { label: 'Provider Name', key: 'providerName' },
    { label: 'Policy Number', key: 'policyNumber', mono: true },
    { label: 'Group Number', key: 'groupNumber', mono: true },
    { label: 'Phone', key: 'phone' },
  ],
  membership: [
    { label: 'Membership ID', key: 'membershipId', mono: true },
    { label: 'URL', key: 'url' },
    { label: 'Username', key: 'username' },
    { label: 'Password', key: 'password', mono: true },
  ],
  outdoor_license: [
    { label: 'License Number', key: 'licenseNumber', mono: true },
    { label: 'First Name', key: 'firstName' },
    { label: 'Last Name', key: 'lastName' },
    { label: 'Expiration Date', key: 'expirationDate' },
  ],
  rewards: [
    { label: 'Reward Number', key: 'rewardNumber', mono: true },
    { label: 'Member Name', key: 'firstName' },
    { label: 'URL', key: 'url' },
    { label: 'PIN', key: 'pin', mono: true },
  ],
  social_security_number: [
    { label: 'Name', key: 'firstName' },
    { label: 'SSN', key: 'ssn', mono: true },
  ],
};

export function GenericFields({ type, values, onChange }: Props) {
  const fields = typeFieldConfig[type];
  if (!fields) return null;

  return (
    <>
      {fields.map(({ label, key, mono }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            value={values[key] || ''}
            onChange={(e) => onChange(key, e.target.value)}
            className={mono ? 'font-mono' : ''}
          />
        </div>
      ))}
    </>
  );
}
