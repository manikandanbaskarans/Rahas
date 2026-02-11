import { ImportWizard } from '@/components/import/ImportWizard';
import { Upload } from 'lucide-react';

export function ImportPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Import</h1>
          <p className="text-muted-foreground mt-1">
            Import passwords from other managers or CSV files. Everything is encrypted in your browser.
          </p>
        </div>
      </div>

      <ImportWizard />
    </div>
  );
}
