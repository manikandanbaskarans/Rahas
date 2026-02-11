import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/api/client';
import {
  Shield,
  KeyRound,
  FolderLock,
  Share2,
  Settings,
  LogOut,
  Users,
  FileText,
  Wrench,
  Archive,
  Trash2,
  Home,
  ShieldCheck,
  Upload,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/vault', label: 'Vault', icon: FolderLock },
  { path: '/checkpost', label: 'Security Checkpost', icon: ShieldCheck },
  { path: '/shared', label: 'Shared with Me', icon: Share2 },
  { path: '/generator', label: 'Generator', icon: Wrench },
  { path: '/import', label: 'Import', icon: Upload },
  { path: '/archive', label: 'Archive', icon: Archive },
  { path: '/deleted', label: 'Recently Deleted', icon: Trash2 },
  { path: '/emergency-kit', label: 'Emergency Kit', icon: FileDown },
  { path: '/admin', label: 'Admin', icon: Users },
  { path: '/audit', label: 'Audit Logs', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Continue with client-side logout regardless
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <Link to="/home" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">VaultKeeper</h1>
              <p className="text-xs text-muted-foreground">Enterprise Vault</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Link
            to="/profile"
            className="flex items-center gap-3 mb-3 rounded-md px-1 py-1 hover:bg-accent transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </Link>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-end px-6 flex-shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
