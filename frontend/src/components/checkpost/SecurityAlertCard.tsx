import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, ShieldCheck, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { SecurityIssue } from '@/utils/securityScoring';

type Severity = 'critical' | 'warning' | 'info' | 'ok';

interface SecurityAlertCardProps {
  title: string;
  severity: Severity;
  count: number;
  total: number;
  issues: SecurityIssue[];
  onAction?: (secretId: string) => void;
  actionLabel?: string;
}

const severityConfig: Record<Severity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ok: { icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
};

export function SecurityAlertCard({
  title,
  severity,
  count,
  total,
  issues,
  onAction,
  actionLabel = 'View',
}: SecurityAlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">
              {count === 0 ? 'No issues found' : `${count} of ${total} items affected`}
            </p>
          </div>
          {issues.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {expanded && issues.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.secretId}
                className="flex items-center justify-between text-sm py-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{issue.secretName}</p>
                  <p className="text-muted-foreground text-xs">{issue.detail}</p>
                </div>
                {onAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 flex-shrink-0"
                    onClick={() => onAction(issue.secretId)}
                  >
                    {actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
