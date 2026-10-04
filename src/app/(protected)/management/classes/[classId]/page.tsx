import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { ClassDetail } from '@/features/classes/client';
import { LoadingState } from '@/shared/components/feedback';

export const metadata = { title: 'Chi tiết lớp học' };
export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  if (!z.uuid({ version: 'v4' }).safeParse(classId).success) notFound();
  return (
    <Suspense fallback={<LoadingState />}>
      <ClassDetail id={classId} />
    </Suspense>
  );
}
