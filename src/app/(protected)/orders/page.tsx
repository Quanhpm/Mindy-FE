import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersPage } from '@/features/orders/client';
import { LoadingState } from '@/shared/components/feedback';
export const metadata: Metadata = { title: 'Đơn của tôi', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OrdersPage />
    </Suspense>
  );
}
