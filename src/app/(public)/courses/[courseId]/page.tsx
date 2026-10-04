import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicCourseDetail } from '@/features/catalog/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Thông tin khóa học' };
export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<LoadingState />}>
      <PublicCourseDetail id={courseId} />
    </Suspense>
  );
}
