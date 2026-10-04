import type { Metadata } from 'next';
import { AuthPage, RegisterForm } from '@/features/auth/client';

export const metadata: Metadata = {
  title: 'Tạo tài khoản',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  return (
    <AuthPage title="Một khởi đầu mới." subtitle="Tạo tài khoản học viên bằng email hoặc Google.">
      <RegisterForm />
    </AuthPage>
  );
}
