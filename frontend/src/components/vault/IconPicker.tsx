import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  FolderLock,
  Key,
  Globe,
  CreditCard,
  FileText,
  Server,
  Database,
  Shield,
  Landmark,
  Mail,
  Wifi,
  User,
  IdCard,
  Briefcase,
  Heart,
  Star,
  Lock,
  Wallet,
  Smartphone,
  Home,
  Car,
  Plane,
  Building2,
  Gamepad2,
} from 'lucide-react';

const icons = [
  { name: 'folder-lock', Icon: FolderLock },
  { name: 'key', Icon: Key },
  { name: 'lock', Icon: Lock },
  { name: 'shield', Icon: Shield },
  { name: 'globe', Icon: Globe },
  { name: 'credit-card', Icon: CreditCard },
  { name: 'file-text', Icon: FileText },
  { name: 'server', Icon: Server },
  { name: 'database', Icon: Database },
  { name: 'landmark', Icon: Landmark },
  { name: 'mail', Icon: Mail },
  { name: 'wifi', Icon: Wifi },
  { name: 'user', Icon: User },
  { name: 'id-card', Icon: IdCard },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'heart', Icon: Heart },
  { name: 'star', Icon: Star },
  { name: 'wallet', Icon: Wallet },
  { name: 'smartphone', Icon: Smartphone },
  { name: 'home', Icon: Home },
  { name: 'car', Icon: Car },
  { name: 'plane', Icon: Plane },
  { name: 'building', Icon: Building2 },
  { name: 'gamepad', Icon: Gamepad2 },
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = icons.find((i) => i.name === value)?.Icon || FolderLock;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={() => setOpen(!open)}
      >
        <SelectedIcon className="h-5 w-5" />
      </Button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-popover border rounded-md shadow-lg z-20 grid grid-cols-6 gap-1 w-56">
          {icons.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
                value === name
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function getVaultIcon(iconName: string) {
  return icons.find((i) => i.name === iconName)?.Icon || FolderLock;
}
