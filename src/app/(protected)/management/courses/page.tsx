import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CoursesManagement } from '@/features/catalog/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Quản lý khóa học' };
export default function CoursesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CoursesManagement />
    </Suspense>
  );
}
