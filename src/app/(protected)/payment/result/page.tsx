import { Suspense } from 'react';
import { PaymentResultPage } from '@/features/orders/client';
export default function Page() {
  return (
    <Suspense>
      <PaymentResultPage />
    </Suspense>
  );
}
