import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ImportProgressProps {
  total: number;
  imported: number;
  failed: number;
  isRunning: boolean;
  errors: string[];
  onDone: () => void;
}

export function ImportProgress({
  total,
  imported,
  failed,
  isRunning,
  errors,
  onDone,
}: ImportProgressProps) {
  const progress = total > 0 ? ((imported + failed) / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {isRunning ? 'Importing...' : 'Import Complete'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isRunning
            ? 'Encrypting and uploading your items. Do not close this page.'
            : `Finished importing ${imported} of ${total} items.`}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            {isRunning ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1 text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold">{total}</p>
            )}
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-2xl font-bold">{imported}</p>
            </div>
            <p className="text-xs text-muted-foreground">Imported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-2xl font-bold">{failed}</p>
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-500 mb-2">Errors:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {err}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isRunning && (
        <div className="flex justify-end">
          <Button onClick={onDone}>Done</Button>
        </div>
      )}
    </div>
  );
}
