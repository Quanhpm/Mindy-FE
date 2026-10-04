import type { Metadata } from 'next';
import { AuthPage, GoogleRegistrationForm } from '@/features/auth/client';

export const metadata: Metadata = {
  title: 'Hoàn tất đăng ký Google',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  return (
    <AuthPage title="Hoàn tất hồ sơ." subtitle="Chỉ còn một bước để bắt đầu cùng Mindy.">
      <GoogleRegistrationForm />
    </AuthPage>
  );
}
