'use client';

import { SessionProvider } from '@/features/auth/client';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
