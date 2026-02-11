import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAutoLock } from '@/hooks/useAutoLock';
import { Layout } from '@/components/common/Layout';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { HomePage } from '@/pages/HomePage';
import { VaultPage } from '@/pages/VaultPage';
import { CheckpostPage } from '@/pages/CheckpostPage';
import { SharedWithMe } from '@/components/sharing/SharedWithMe';
import { PasswordGenerator } from '@/components/secrets/PasswordGenerator';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AuditViewer } from '@/components/admin/AuditViewer';
import { SettingsPage } from '@/components/admin/SettingsPage';
import { LockScreen } from '@/components/security/LockScreen';
import { ArchiveView } from '@/components/vault/ArchiveView';
import { RecentlyDeleted } from '@/components/vault/RecentlyDeleted';
import { ImportPage } from '@/pages/ImportPage';
import { EmergencyKitPage } from '@/pages/EmergencyKitPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { VaultDetailPage } from '@/pages/VaultDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const vaultKey = useAuthStore((s) => s.vaultKey);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!vaultKey) {
    return <LockScreen />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  useAutoLock();

  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault"
        element={
          <ProtectedRoute>
            <VaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkpost"
        element={
          <ProtectedRoute>
            <CheckpostPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shared"
        element={
          <ProtectedRoute>
            <SharedWithMe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/generator"
        element={
          <ProtectedRoute>
            <PasswordGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/archive"
        element={
          <ProtectedRoute>
            <ArchiveView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deleted"
        element={
          <ProtectedRoute>
            <RecentlyDeleted />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <ImportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/emergency-kit"
        element={
          <ProtectedRoute>
            <EmergencyKitPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/:vaultId/details"
        element={
          <ProtectedRoute>
            <VaultDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AuditViewer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
