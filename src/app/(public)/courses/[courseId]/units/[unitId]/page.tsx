import type { Metadata } from 'next';
import { PublicCourseUnit } from '@/features/catalog/client';
export const metadata: Metadata = { title: 'Đề cương khóa học' };
export default async function CourseUnitPage({
  params,
}: {
  params: Promise<{ courseId: string; unitId: string }>;
}) {
  const { courseId, unitId } = await params;
  return <PublicCourseUnit courseId={courseId} unitId={unitId} />;
}
