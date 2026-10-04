import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicCourses } from '@/features/catalog/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Khóa học' };
export default function CoursesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PublicCourses />
    </Suspense>
  );
}
