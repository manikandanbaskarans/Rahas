import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldTypeInput, type CustomFieldType } from './fieldTypes/FieldTypeInput';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

export interface CustomField {
  label: string;
  type: CustomFieldType;
  value: string;
}

interface CustomFieldEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  readOnly?: boolean;
}

const fieldTypeOptions: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'address', label: 'Address' },
  { value: 'otp', label: 'OTP / TOTP' },
  { value: 'security_question', label: 'Security Question' },
  { value: 'section', label: 'Section Divider' },
  { value: 'signin_with', label: 'Sign In With' },
];

export function CustomFieldEditor({ fields, onChange, readOnly }: CustomFieldEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addField = (type: CustomFieldType) => {
    onChange([...fields, { label: '', type, value: '' }]);
    setShowAddMenu(false);
  };

  const updateField = (index: number, updates: Partial<CustomField>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Custom Fields</Label>
        {!readOnly && (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Field
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10 py-1">
                {fieldTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => addField(opt.value)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {fields.length === 0 && !readOnly && (
        <p className="text-xs text-muted-foreground py-2">
          No custom fields. Click "Add Field" to add one.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={index} className="border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            {field.type !== 'section' ? (
              <Input
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="Field label"
                className="text-xs h-8"
                readOnly={readOnly}
              />
            ) : (
              <Input
                value={field.value}
                onChange={(e) => updateField(index, { value: e.target.value })}
                placeholder="Section name"
                className="text-xs h-8 font-semibold"
                readOnly={readOnly}
              />
            )}
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
              {fieldTypeOptions.find((o) => o.value === field.type)?.label}
            </span>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => removeField(index)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
          {field.type !== 'section' && (
            <FieldTypeInput
              type={field.type}
              value={field.value}
              onChange={(value) => updateField(index, { value })}
              readOnly={readOnly}
            />
          )}
        </div>
      ))}
    </div>
  );
}
