import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StudentClassPage } from '@/features/learning/client';
export const metadata: Metadata = {
  title: 'Lớp học của bạn',
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return (
    <Suspense>
      <StudentClassPage id={classId} />
    </Suspense>
  );
}
