import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicClassDetail } from '@/features/catalog/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Lớp và lịch học' };
export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return (
    <Suspense fallback={<LoadingState />}>
      <PublicClassDetail id={classId} />
    </Suspense>
  );
}
