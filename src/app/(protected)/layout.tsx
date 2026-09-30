import { AuthBoundary } from '@/features/auth/client';
import { AppShell } from '../_components/app-shell';
import { AppProviders } from '../_providers/app-providers';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthBoundary>
        <AppShell>{children}</AppShell>
      </AuthBoundary>
    </AppProviders>
  );
}
