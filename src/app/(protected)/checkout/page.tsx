import type { Metadata } from 'next';
import { CheckoutPage } from '@/features/orders/client';
export const metadata: Metadata = {
  title: 'Tạo đơn đăng ký',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <CheckoutPage />;
}
