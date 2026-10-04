import type { Metadata } from 'next';
import { CartPage } from '@/features/cart/client';

export const metadata: Metadata = { title: 'Giỏ hàng' };
export default function CartRoute() {
  return <CartPage />;
}
