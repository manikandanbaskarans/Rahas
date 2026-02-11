import { useEffect, useState } from 'react';
import { adminAPI } from '@/api/client';
import type { AuditLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export function AuditViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [orgId, setOrgId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 20;

  const loadLogs = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const response = await adminAPI.getAuditLogs(orgId, {
        page,
        page_size: pageSize,
        action: actionFilter || undefined,
      });
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch {
      console.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) loadLogs();
  }, [orgId, page, actionFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const actionColors: Record<string, string> = {
    'user.login': 'bg-green-100 text-green-800',
    'user.logout': 'bg-gray-100 text-gray-800',
    'user.register': 'bg-blue-100 text-blue-800',
    'secret.create': 'bg-purple-100 text-purple-800',
    'secret.access': 'bg-yellow-100 text-yellow-800',
    'secret.update': 'bg-orange-100 text-orange-800',
    'secret.delete': 'bg-red-100 text-red-800',
    'secret.share': 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Audit Logs</h2>

      <div className="flex gap-4">
        <Input
          placeholder="Organization ID"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="max-w-md"
        />
        <Input
          placeholder="Filter by action (e.g., user.login)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={loadLogs} disabled={!orgId || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
        </Button>
      </div>

      {logs.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No audit logs</h3>
            <p className="text-muted-foreground">
              Enter an organization ID to view audit logs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">Resource</th>
                  <th className="text-left p-3 font-medium">IP Address</th>
                  <th className="text-left p-3 font-medium">User ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          actionColors[log.action] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-muted-foreground">{log.resource_type}</span>
                      {log.resource_id && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({log.resource_id.substring(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{log.ip_address || '-'}</td>
                    <td className="p-3 font-mono text-xs">
                      {log.user_id ? log.user_id.substring(0, 8) + '...' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
