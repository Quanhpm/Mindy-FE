import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReconciliationPage } from '@/features/payments/client';
export const metadata: Metadata = {
  title: 'Đối soát thanh toán',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense>
      <ReconciliationPage />
    </Suspense>
  );
}
