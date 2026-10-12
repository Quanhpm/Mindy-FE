import { Suspense } from 'react';
import { ManagerClassesPage } from '@/features/classes/client';
export default function Page() {
  return (
    <Suspense>
      <ManagerClassesPage />
    </Suspense>
  );
}
