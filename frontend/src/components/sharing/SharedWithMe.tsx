import { useEffect, useState } from 'react';
import { sharingAPI } from '@/api/client';
import type { SharedSecret } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Share2, Key, Loader2 } from 'lucide-react';
import { formatTimeAgo } from '@/utils/passwordStrength';

export function SharedWithMe() {
  const [shares, setShares] = useState<SharedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const response = await sharingAPI.sharedWithMe();
      setShares(response.data);
    } catch {
      console.error('Failed to load shared secrets');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Shared with Me</h2>

      {shares.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Share2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No shared secrets</h3>
            <p className="text-muted-foreground">
              Secrets shared with you by other users will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shares.map((item) => (
            <Card key={item.share.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">[Encrypted]</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.secret_type.replace('_', ' ')} - {item.share.permission} access
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTimeAgo(item.share.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
