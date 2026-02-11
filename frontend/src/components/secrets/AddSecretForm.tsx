import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { secretsAPI, toolsAPI } from '@/api/client';
import { encryptSecretBundle } from '@/crypto/keyHierarchy';
import type { SecretType, DecryptedSecret } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { CustomFieldEditor, type CustomField } from './CustomFieldEditor';
import { LoginFields } from './typeFields/LoginFields';
import { CreditCardFields } from './typeFields/CreditCardFields';
import { IdentityFields } from './typeFields/IdentityFields';
import { BankAccountFields } from './typeFields/BankAccountFields';
import { PassportFields } from './typeFields/PassportFields';
import { ServerFields } from './typeFields/ServerFields';
import { DatabaseFields } from './typeFields/DatabaseFields';
import { SoftwareLicenseFields } from './typeFields/SoftwareLicenseFields';
import { WirelessRouterFields } from './typeFields/WirelessRouterFields';
import { GenericFields } from './typeFields/GenericFields';

interface AddSecretFormProps {
  onClose: () => void;
  onAdded: (secret: DecryptedSecret) => void;
}

const primaryTypes: { value: SecretType; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'password', label: 'Password' },
  { value: 'secure_note', label: 'Secure Note' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'identity', label: 'Identity' },
  { value: 'document', label: 'Document' },
];

const extendedTypes: { value: SecretType; label: string }[] = [
  { value: 'api_token', label: 'API Token' },
  { value: 'ssh_key', label: 'SSH Key' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'encryption_key', label: 'Encryption Key' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'crypto_wallet', label: 'Crypto Wallet' },
  { value: 'database', label: 'Database' },
  { value: 'driver_license', label: 'Driver License' },
  { value: 'email_account', label: 'Email Account' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'membership', label: 'Membership' },
  { value: 'outdoor_license', label: 'Outdoor License' },
  { value: 'passport', label: 'Passport' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'server', label: 'Server' },
  { value: 'social_security_number', label: 'SSN' },
  { value: 'software_license', label: 'Software License' },
  { value: 'wireless_router', label: 'Wireless Router' },
];

export function AddSecretForm({ onClose, onAdded }: AddSecretFormProps) {
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const currentVault = useVaultStore((s) => s.currentVault);

  const [type, setType] = useState<SecretType>('login');
  const [name, setName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExtended, setShowExtended] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleGeneratePassword = async () => {
    try {
      const response = await toolsAPI.generatePassword({
        length: 20,
        include_uppercase: true,
        include_lowercase: true,
        include_numbers: true,
        include_symbols: true,
      });
      handleFieldChange('password', response.data.password);
    } catch {
      setError('Failed to generate password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultKey || !currentVault) return;
    setError('');
    setIsLoading(true);

    try {
      const data: Record<string, string> = { ...fieldValues };
      if (notes) data.notes = notes;

      const metadata: Record<string, unknown> | null = customFields.length > 0
        ? { custom_fields: customFields }
        : null;

      const bundle = await encryptSecretBundle(
        name,
        JSON.stringify(data),
        metadata,
        vaultKey
      );

      const response = await secretsAPI.create(currentVault.id, {
        type,
        name_encrypted: bundle.nameEncrypted,
        data_encrypted: bundle.dataEncrypted,
        encrypted_item_key: bundle.encryptedItemKey,
        metadata_encrypted: bundle.metadataEncrypted || undefined,
      });

      const newSecret: DecryptedSecret = {
        id: response.data.id,
        vault_id: response.data.vault_id,
        folder_id: response.data.folder_id,
        type,
        name,
        data,
        metadata: customFields.length > 0 ? { custom_fields: customFields } : null,
        favorite: false,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      };

      onAdded(newSecret);
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to save secret');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTypeFields = () => {
    switch (type) {
      case 'login':
      case 'password':
      case 'api_token':
        return (
          <LoginFields
            values={fieldValues}
            onChange={handleFieldChange}
            onGeneratePassword={type !== 'api_token' ? handleGeneratePassword : undefined}
          />
        );
      case 'credit_card':
        return <CreditCardFields values={fieldValues} onChange={handleFieldChange} />;
      case 'identity':
        return <IdentityFields values={fieldValues} onChange={handleFieldChange} />;
      case 'bank_account':
        return <BankAccountFields values={fieldValues} onChange={handleFieldChange} />;
      case 'passport':
        return <PassportFields values={fieldValues} onChange={handleFieldChange} />;
      case 'server':
        return <ServerFields values={fieldValues} onChange={handleFieldChange} />;
      case 'database':
        return <DatabaseFields values={fieldValues} onChange={handleFieldChange} />;
      case 'software_license':
        return <SoftwareLicenseFields values={fieldValues} onChange={handleFieldChange} />;
      case 'wireless_router':
        return <WirelessRouterFields values={fieldValues} onChange={handleFieldChange} />;
      case 'ssh_key':
      case 'certificate':
      case 'encryption_key':
        return (
          <div className="space-y-2">
            <Label htmlFor="key">Key Content</Label>
            <textarea
              id="key"
              placeholder="Paste your key here..."
              value={fieldValues.key || ''}
              onChange={(e) => handleFieldChange('key', e.target.value)}
              rows={6}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        );
      case 'secure_note':
      case 'document':
        return null; // Notes field is always shown below
      default:
        return <GenericFields type={type} values={fieldValues} onChange={handleFieldChange} />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add New Secret</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {primaryTypes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setType(value); setFieldValues({}); }}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    type === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-input'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowExtended(!showExtended)}
                className="px-3 py-1.5 text-xs rounded-full border border-dashed border-input text-muted-foreground hover:bg-accent flex items-center gap-1"
              >
                {showExtended ? 'Less' : 'More'}
                {showExtended ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            {showExtended && (
              <div className="flex flex-wrap gap-2 pt-2">
                {extendedTypes.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setType(value); setFieldValues({}); }}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      type === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-input'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-name">Name</Label>
            <Input
              id="secret-name"
              placeholder="e.g., GitHub Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {renderTypeFields()}

          <CustomFieldEditor fields={customFields} onChange={setCustomFields} />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Secret
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
