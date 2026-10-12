import { Suspense } from 'react';
import { ManagerMaterialsPage } from '@/features/classes/client';
export default function Page() {
  return (
    <Suspense>
      <ManagerMaterialsPage />
    </Suspense>
  );
}
