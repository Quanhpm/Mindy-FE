import { Suspense } from 'react';
import { CashClassPreview } from '@/features/catalog/client';
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return (
    <Suspense>
      <CashClassPreview id={classId} />
    </Suspense>
  );
}
