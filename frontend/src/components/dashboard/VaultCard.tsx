import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';
import { decrypt } from '@/crypto/encryption';
import { Card, CardContent } from '@/components/ui/card';
import { FolderLock, ChevronRight } from 'lucide-react';
import type { Vault } from '@/types';
import { useEffect, useState } from 'react';

interface VaultCardProps {
  vault: Vault;
}

export function VaultCard({ vault }: VaultCardProps) {
  const navigate = useNavigate();
  const vaultKey = useAuthStore((s) => s.vaultKey);
  const setCurrentVault = useVaultStore((s) => s.setCurrentVault);
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (vaultKey) {
      decrypt(vault.name_encrypted, vaultKey)
        .then(setName)
        .catch(() => setName('Vault'));
    }
  }, [vault.name_encrypted, vaultKey]);

  const handleClick = () => {
    setCurrentVault(vault);
    navigate('/vault');
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={handleClick}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <FolderLock className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{name || 'Loading...'}</p>
          <p className="text-sm text-muted-foreground">
            {vault.item_count ?? 0} item{(vault.item_count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </CardContent>
    </Card>
  );
}
