import type { Metadata } from 'next';
import { AuthPage, LoginForm } from '@/features/auth/client';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  return (
    <AuthPage title="Chào mừng trở lại." subtitle="Đăng nhập để tiếp tục hành trình cùng Mindy.">
      <LoginForm />
    </AuthPage>
  );
}
