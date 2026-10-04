import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClassesList } from '@/features/classes/client';
import { LoadingState } from '@/shared/components/feedback';

export const metadata: Metadata = { title: 'Lớp học' };
export default function ClassesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ClassesList />
    </Suspense>
  );
}
