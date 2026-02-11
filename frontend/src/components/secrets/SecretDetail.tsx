import { useState } from 'react';
import type { DecryptedSecret } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { secureCopy } from '@/crypto/memoryGuard';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Share2,
  Star,
  StarOff,
  Clock,
  ExternalLink,
  Archive,
} from 'lucide-react';
import { formatTimeAgo } from '@/utils/passwordStrength';
import { CustomFieldEditor, type CustomField } from './CustomFieldEditor';

interface SecretDetailProps {
  secret: DecryptedSecret;
  onClose: () => void;
  onDelete: (id: string) => void;
  onShare: (secret: DecryptedSecret) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive?: (id: string) => void;
}

const sensitiveFields = new Set([
  'password', 'cvv', 'pin', 'ssn', 'seedPhrase', 'licenseKey',
  'accountNumber', 'passportNumber', 'cardNumber',
]);

const fieldLabels: Record<string, string> = {
  username: 'Username',
  password: 'Password',
  url: 'URL',
  cardNumber: 'Card Number',
  cardholderName: 'Cardholder Name',
  expiryDate: 'Expiry Date',
  cvv: 'CVV',
  pin: 'PIN',
  firstName: 'First Name',
  lastName: 'Last Name',
  middleName: 'Middle Name',
  birthDate: 'Date of Birth',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  country: 'Country',
  bankName: 'Bank Name',
  accountNumber: 'Account Number',
  routingNumber: 'Routing Number',
  accountType: 'Account Type',
  swiftCode: 'SWIFT Code',
  ibanNumber: 'IBAN',
  passportNumber: 'Passport Number',
  issuingCountry: 'Issuing Country',
  issueDate: 'Issue Date',
  expirationDate: 'Expiration Date',
  hostname: 'Hostname',
  port: 'Port',
  databaseName: 'Database Name',
  licenseKey: 'License Key',
  version: 'Version',
  ssid: 'SSID',
  encryptionType: 'Encryption Type',
  walletAddress: 'Wallet Address',
  seedPhrase: 'Seed Phrase',
  providerName: 'Provider',
  policyNumber: 'Policy Number',
  groupNumber: 'Group Number',
  membershipId: 'Membership ID',
  licenseNumber: 'License Number',
  rewardNumber: 'Reward Number',
  ssn: 'SSN',
};

export function SecretDetail({
  secret,
  onDelete,
  onShare,
  onToggleFavorite,
  onArchive,
}: SecretDetailProps) {
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    const success = await secureCopy(text);
    if (success) {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const toggleSensitive = (field: string) => {
    setShowSensitive((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const renderField = (key: string, value: string) => {
    if (key === 'notes') return null; // Rendered separately
    const label = fieldLabels[key] || key;
    const isSensitive = sensitiveFields.has(key);
    const isUrl = key === 'url';

    return (
      <div key={key} className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-2">
          {key === 'key' || key === 'certificate' || key === 'privateKey' ? (
            <textarea
              value={value}
              readOnly
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : (
            <Input
              type={isSensitive && !showSensitive[key] ? 'password' : 'text'}
              value={value}
              readOnly
              className={isSensitive ? 'font-mono' : ''}
            />
          )}
          {isSensitive && (
            <Button variant="outline" size="icon" onClick={() => toggleSensitive(key)}>
              {showSensitive[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          {isUrl && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => handleCopy(value, key)}>
            {copied === key ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{secret.name}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(secret.id, !secret.favorite)}
          >
            {secret.favorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onShare(secret)}>
            <Share2 className="h-4 w-4" />
          </Button>
          {onArchive && (
            <Button variant="ghost" size="icon" onClick={() => onArchive(secret.id)}>
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => onDelete(secret.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {formatTimeAgo(secret.updated_at)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
            {secret.type.replace(/_/g, ' ')}
          </span>
        </div>

        {Object.entries(secret.data).map(([key, value]) => {
          if (!value || key === 'notes') return null;
          return renderField(key, value);
        })}

        {secret.data.notes && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <textarea
              value={secret.data.notes}
              readOnly
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {secret.metadata && (() => {
          const meta = secret.metadata as Record<string, unknown>;
          const customFields = meta.custom_fields as CustomField[] | undefined;
          if (customFields && customFields.length > 0) {
            return (
              <CustomFieldEditor
                fields={customFields}
                onChange={() => {}}
                readOnly
              />
            );
          }
          // Fallback: render legacy flat key-value metadata
          const flatEntries = Object.entries(secret.metadata as Record<string, string>).filter(
            ([key]) => key !== 'custom_fields'
          );
          if (flatEntries.length > 0) {
            return (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Custom Fields</Label>
                {flatEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs font-medium min-w-20">{key}:</span>
                    <Input value={String(value)} readOnly className="text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(String(value), key)}
                    >
                      {copied === key ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })()}

        {sensitiveFields.size > 0 && (
          <p className="text-xs text-muted-foreground">
            Copied values are cleared from clipboard after 30 seconds
          </p>
        )}
      </CardContent>
    </Card>
  );
}
