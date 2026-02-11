import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Monitor, Smartphone, Loader2, X } from 'lucide-react';

interface Device {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

export function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/profile/devices');
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    setRevokingId(deviceId);
    try {
      await api.delete(`/profile/devices/${deviceId}`);
      setDevices(devices.filter((d) => d.id !== deviceId));
    } catch (err) {
      console.error('Failed to revoke session:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (info: string | null) => {
    if (!info) return Monitor;
    const lower = info.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No active sessions found.</p>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => {
        const Icon = getDeviceIcon(device.device_info);
        return (
          <Card key={device.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {device.device_info || 'Unknown Device'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {device.ip_address || 'Unknown IP'} &middot; {formatDate(device.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {device.is_active ? (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Revoked
                  </span>
                )}
                {device.is_active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={revokingId === device.id}
                    onClick={() => handleRevoke(device.id)}
                  >
                    {revokingId === device.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
