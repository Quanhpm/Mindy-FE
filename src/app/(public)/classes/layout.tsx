import { Suspense } from 'react';
import { PublicShell } from '@/app/_components/public-shell';
import { AppProviders } from '@/app/_providers/app-providers';

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <Suspense>
        <PublicShell>{children}</PublicShell>
      </Suspense>
    </AppProviders>
  );
}
