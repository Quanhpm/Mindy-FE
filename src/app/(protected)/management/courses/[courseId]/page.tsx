import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CourseDetailManagement } from '@/features/catalog/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Chi tiết khóa học' };
export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<LoadingState />}>
      <CourseDetailManagement id={courseId} />
    </Suspense>
  );
}
