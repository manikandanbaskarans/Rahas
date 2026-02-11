import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { vaultAPI } from '@/api/client';
import { decrypt } from '@/crypto/encryption';
import { encryptSecretBundle } from '@/crypto/keyHierarchy';
import {
  parseCSV,
  detectSource,
  getDefaultMapping,
  mapRowToSecretData,
  type ImportSource,
  type ParsedCSV,
  type ColumnMapping,
} from '@/utils/csvParser';
import { SourceSelector } from './SourceSelector';
import { ColumnMapper } from './ColumnMapper';
import { ImportProgress } from './ImportProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Vault } from '@/types';
import { api } from '@/api/client';

type Step = 'source' | 'upload' | 'mapping' | 'vault' | 'review' | 'importing';

export function ImportWizard() {
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const { vaults, setVaults } = useVaultStore();

  const [step, setStep] = useState<Step>('source');
  const [, setSource] = useState<ImportSource>('csv');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [targetVault, setTargetVault] = useState<Vault | null>(null);
  const [vaultNames, setVaultNames] = useState<Record<string, string>>({});

  // Import progress
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);
  const [importFailed, setImportFailed] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSourceSelect = (s: ImportSource) => {
    setSource(s);
    setStep('upload');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const csv = parseCSV(text);

    if (csv.headers.length === 0) return;

    const detected = detectSource(csv.headers);
    if (detected !== 'unknown') setSource(detected);

    const defaultMapping = getDefaultMapping(detected, csv.headers);
    setMapping(defaultMapping);
    setParsed(csv);
    setStep('mapping');
  };

  const handleMappingConfirm = async () => {
    // Load vaults and decrypt names
    if (!vaultKey) return;
    try {
      const response = await vaultAPI.list();
      const vaultList: Vault[] = response.data.vaults;
      setVaults(vaultList);

      const names: Record<string, string> = {};
      for (const v of vaultList) {
        try {
          names[v.id] = await decrypt(v.name_encrypted, vaultKey);
        } catch {
          names[v.id] = 'Vault';
        }
      }
      setVaultNames(names);

      if (vaultList.length > 0) {
        setTargetVault(vaultList[0]);
      }
    } catch {
      // Continue anyway
    }
    setStep('vault');
  };

  const handleVaultConfirm = () => {
    setStep('review');
  };

  const handleStartImport = async () => {
    if (!vaultKey || !parsed || !targetVault) return;

    setStep('importing');
    setIsImporting(true);
    setImportTotal(parsed.rows.length);
    setImportDone(0);
    setImportFailed(0);
    setImportErrors([]);

    // Process in batches of 50
    const batchSize = 50;
    let done = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsed.rows.length; i += batchSize) {
      const batch = parsed.rows.slice(i, i + batchSize);
      const items = [];

      for (const row of batch) {
        const { name, data, type } = mapRowToSecretData(row, mapping);

        try {
          const bundle = await encryptSecretBundle(
            name,
            JSON.stringify(data),
            null,
            vaultKey,
          );

          items.push({
            type,
            name_encrypted: bundle.nameEncrypted,
            data_encrypted: bundle.dataEncrypted,
            encrypted_item_key: bundle.encryptedItemKey,
            metadata_encrypted: bundle.metadataEncrypted,
          });
        } catch (err) {
          failed++;
          errors.push(`Failed to encrypt "${name}": ${String(err)}`);
        }
      }

      if (items.length > 0) {
        try {
          const response = await api.post('/import/bulk-create', {
            vault_id: targetVault.id,
            items,
          });
          done += response.data.imported;
          failed += response.data.failed;
          errors.push(...response.data.errors);
        } catch (err) {
          failed += items.length;
          errors.push(`Batch upload failed: ${String(err)}`);
        }
      }

      setImportDone(done);
      setImportFailed(failed);
      setImportErrors([...errors]);
    }

    setIsImporting(false);
  };

  const reviewItems = parsed
    ? parsed.rows.slice(0, 5).map((row) => mapRowToSecretData(row, mapping))
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        {['Source', 'Upload', 'Mapping', 'Vault', 'Review', 'Import'].map((label, idx) => {
          const steps: Step[] = ['source', 'upload', 'mapping', 'vault', 'review', 'importing'];
          const isActive = steps.indexOf(step) >= idx;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx + 1}
              </div>
              <span className={isActive ? 'text-foreground' : ''}>{label}</span>
              {idx < 5 && <div className="w-4 h-px bg-muted" />}
            </div>
          );
        })}
      </div>

      {step === 'source' && <SourceSelector onSelect={handleSourceSelect} />}

      {step === 'upload' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Upload CSV File</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select your exported CSV file. It will be processed entirely in your browser.
            </p>
          </div>
          <Card
            className="border-2 border-dashed cursor-pointer hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-12 text-center">
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                or drag and drop
              </p>
            </CardContent>
          </Card>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => setStep('source')}>
            Back
          </Button>
        </div>
      )}

      {step === 'mapping' && parsed && (
        <ColumnMapper
          headers={parsed.headers}
          mapping={mapping}
          previewRows={parsed.rows.slice(0, 3)}
          onMappingChange={setMapping}
          onConfirm={handleMappingConfirm}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'vault' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Select Target Vault</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose which vault to import {parsed?.rows.length} items into.
            </p>
          </div>
          <div className="space-y-2">
            {vaults.map((vault) => (
              <Card
                key={vault.id}
                className={`cursor-pointer transition-colors ${
                  targetVault?.id === vault.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setTargetVault(vault)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{vaultNames[vault.id] || 'Vault'}</p>
                    <p className="text-xs text-muted-foreground">
                      {vault.item_count ?? 0} items
                    </p>
                  </div>
                  {targetVault?.id === vault.id && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Back
            </Button>
            <Button onClick={handleVaultConfirm} disabled={!targetVault}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Review Import</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {parsed?.rows.length} items will be encrypted and imported into "{vaultNames[targetVault?.id ?? ''] || 'Vault'}".
            </p>
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Preview (first 5 items):</p>
              <div className="space-y-2">
                {reviewItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                    <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded">
                      {item.type}
                    </span>
                    <span className="font-medium truncate">{item.name}</span>
                    {item.data.username && (
                      <span className="text-muted-foreground text-xs">{item.data.username}</span>
                    )}
                  </div>
                ))}
                {(parsed?.rows.length ?? 0) > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {(parsed?.rows.length ?? 0) - 5} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('vault')}>
              Back
            </Button>
            <Button onClick={handleStartImport}>
              Start Import
            </Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <ImportProgress
          total={importTotal}
          imported={importDone}
          failed={importFailed}
          isRunning={isImporting}
          errors={importErrors}
          onDone={() => window.location.href = '/vault'}
        />
      )}
    </div>
  );
}
