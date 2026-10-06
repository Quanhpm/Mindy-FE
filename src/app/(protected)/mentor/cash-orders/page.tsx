import { Suspense } from 'react';
import { MentorCashOrdersPage } from '@/features/orders/client';
export default function Page() {
  return (
    <Suspense>
      <MentorCashOrdersPage />
    </Suspense>
  );
}
