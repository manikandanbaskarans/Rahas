import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { sharingAPI } from '@/api/client';
import { encryptItemKey, generateItemKey } from '@/crypto/keyHierarchy';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Copy, Check, Loader2 } from 'lucide-react';

interface ShareLinkDialogProps {
  secretId: string;
  secretName: string;
  onClose: () => void;
}

const expiryOptions = [
  { label: '1 hour', hours: 1 },
  { label: '1 day', hours: 24 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
];

export function ShareLinkDialog({ secretId, secretName, onClose }: ShareLinkDialogProps) {
  const vaultKey = useAuthStore((s) => s.vaultKey);

  const [expiryHours, setExpiryHours] = useState(24);
  const [maxViews, setMaxViews] = useState<number | ''>('');
  const [isCreating, setIsCreating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!vaultKey) return;

    setIsCreating(true);
    try {
      // Generate a link-specific item key
      const linkKey = await generateItemKey();
      const encryptedKey = await encryptItemKey(linkKey, vaultKey);

      const response = await sharingAPI.createShareLink(secretId, {
        expires_in_hours: expiryHours,
        max_views: maxViews || undefined,
        encrypted_item_key_for_link: encryptedKey,
      });

      const token = response.data.token;
      const link = `${window.location.origin}/share/${token}`;
      setShareLink(link);
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-[420px]">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Create Share Link</h3>
          </div>

          <p className="text-sm text-muted-foreground">
            Create a shareable link for "{secretName}".
          </p>

          {!shareLink ? (
            <>
              <div className="space-y-2">
                <Label>Expires After</Label>
                <div className="grid grid-cols-4 gap-2">
                  {expiryOptions.map((opt) => (
                    <Button
                      key={opt.hours}
                      variant={expiryHours === opt.hours ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExpiryHours(opt.hours)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Maximum Views (optional)</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  min={1}
                  value={maxViews}
                  onChange={(e) =>
                    setMaxViews(e.target.value ? parseInt(e.target.value) : '')
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Set to 1 for a one-time view link.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Link
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Input readOnly value={shareLink} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in {expiryOptions.find((o) => o.hours === expiryHours)?.label}.
                {maxViews ? ` Limited to ${maxViews} view${Number(maxViews) > 1 ? 's' : ''}.` : ''}
              </p>
              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
