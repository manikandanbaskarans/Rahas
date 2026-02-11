import { Card, CardContent } from '@/components/ui/card';
import { Chrome, Globe, Key, Shield, FileText, Upload } from 'lucide-react';
import type { ImportSource } from '@/utils/csvParser';

interface SourceSelectorProps {
  onSelect: (source: ImportSource) => void;
}

const sources: { id: ImportSource; name: string; icon: typeof Chrome; description: string }[] = [
  { id: 'chrome', name: 'Chrome', icon: Chrome, description: 'Google Chrome passwords export' },
  { id: 'firefox', name: 'Firefox', icon: Globe, description: 'Mozilla Firefox passwords export' },
  { id: 'lastpass', name: 'LastPass', icon: Key, description: 'LastPass CSV export' },
  { id: 'bitwarden', name: 'Bitwarden', icon: Shield, description: 'Bitwarden JSON/CSV export' },
  { id: '1password', name: '1Password', icon: Key, description: '1Password CSV export' },
  { id: 'csv', name: 'Generic CSV', icon: FileText, description: 'Any CSV with password data' },
];

export function SourceSelector({ onSelect }: SourceSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Select Import Source</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose where you're importing from. Your file is processed entirely in your browser.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <Card
              key={source.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(source.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">{source.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">Or drop a CSV file here</p>
        <p className="text-xs text-muted-foreground mt-1">
          We'll auto-detect the format
        </p>
      </div>
    </div>
  );
}
