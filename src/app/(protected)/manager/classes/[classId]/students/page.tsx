import { Suspense } from 'react';
import { ManagerClassesPage } from '@/features/classes/client';
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return (
    <Suspense>
      <ManagerClassesPage classId={classId} />
    </Suspense>
  );
}
