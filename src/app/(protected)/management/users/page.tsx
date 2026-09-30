import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UsersList } from '@/features/users/client';
import { LoadingState } from '@/shared/components/feedback';

export const metadata: Metadata = { title: 'Người dùng' };
export default function UsersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UsersList />
    </Suspense>
  );
}
