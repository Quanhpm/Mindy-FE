import type { Metadata } from 'next';
import { AuthPage, GoogleCallbackForm } from '@/features/auth/client';

export const metadata: Metadata = {
  title: 'Hoàn tất đăng nhập Google',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page() {
  return (
    <AuthPage title="Đang kết nối Google." subtitle="Đợi một chút để hoàn tất đăng nhập an toàn.">
      <GoogleCallbackForm />
    </AuthPage>
  );
}
