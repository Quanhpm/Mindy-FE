import { Suspense } from 'react';
import { MentorClassesPage } from '@/features/classes/client';
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return (
    <Suspense>
      <MentorClassesPage classId={classId} />
    </Suspense>
  );
}
