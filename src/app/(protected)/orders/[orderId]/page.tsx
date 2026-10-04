import type { Metadata } from 'next';
import { OrderDetailPage } from '@/features/orders/client';
export const metadata: Metadata = {
  title: 'Chi tiết đơn đăng ký',
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderDetailPage id={orderId} />;
}
