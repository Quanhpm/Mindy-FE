import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CategoriesManagement } from '@/features/catalog/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Danh mục khóa học' };
export default function CourseCategoriesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CategoriesManagement />
    </Suspense>
  );
}
