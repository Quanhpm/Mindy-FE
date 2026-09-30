import type { Metadata } from 'next';
import { AccountPanel } from '@/features/auth/client';

export const metadata: Metadata = { title: 'Tài khoản của tôi' };
export default function AccountPage() {
  return <AccountPanel />;
}
