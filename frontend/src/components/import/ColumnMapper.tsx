import type { SecretData } from '@/types';
import type { ColumnMapping, ParsedCSVRow } from '@/utils/csvParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  previewRows: ParsedCSVRow[];
  onMappingChange: (mapping: ColumnMapping) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const targetFields: { value: keyof SecretData | 'name' | 'skip'; label: string }[] = [
  { value: 'skip', label: '— Skip —' },
  { value: 'name', label: 'Item Name' },
  { value: 'username', label: 'Username' },
  { value: 'password', label: 'Password' },
  { value: 'url', label: 'URL' },
  { value: 'notes', label: 'Notes' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'cardNumber', label: 'Card Number' },
  { value: 'key', label: 'Key / Token' },
];

export function ColumnMapper({
  headers,
  mapping,
  previewRows,
  onMappingChange,
  onConfirm,
  onBack,
}: ColumnMapperProps) {
  const handleFieldChange = (csvHeader: string, value: string) => {
    onMappingChange({ ...mapping, [csvHeader]: value as keyof SecretData | 'name' | 'skip' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Map Columns</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Match CSV columns to VaultKeeper fields. We've auto-detected common mappings.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">CSV Column</th>
                <th className="text-left p-3 font-medium">Maps To</th>
                <th className="text-left p-3 font-medium">Preview</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header) => (
                <tr key={header} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{header}</td>
                  <td className="p-3">
                    <select
                      className="w-full border rounded px-2 py-1 text-sm bg-background"
                      value={mapping[header] || 'skip'}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                    >
                      {targetFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground truncate max-w-40">
                    {previewRows[0]?.[header] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onConfirm}>
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
