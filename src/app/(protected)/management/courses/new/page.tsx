import type { Metadata } from 'next';
import { CourseCreateForm } from '@/features/catalog/client';
export const metadata: Metadata = { title: 'Tạo khóa học' };
export default function NewCoursePage() {
  return <CourseCreateForm />;
}
