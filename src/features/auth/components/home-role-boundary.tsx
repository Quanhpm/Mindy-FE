'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingState } from '@/shared/components/feedback';
import { homeForRole } from '../permissions/access-policy';
import { useSession } from '../session/session-provider';

export function HomeRoleBoundary({ children }: { children: React.ReactNode }) {
  const { user, state } = useSession();
  const router = useRouter();
  const destination =
    state === 'authenticated' && user && user.role !== 'STUDENT' ? homeForRole(user.role) : null;
  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);
  if (state === 'loading' || destination) return <LoadingState label="Đang mở trang của bạn…" />;
  return children;
}
