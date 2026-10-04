import type { Metadata } from 'next';
import { AuthPage, VerifyEmailForm } from '@/features/auth/client';

export const metadata: Metadata = {
  title: 'Xác thực email',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      title="Xác thực email."
      subtitle="Kích hoạt tài khoản để bắt đầu hành trình cùng Mindy."
    >
      <VerifyEmailForm token={typeof params.token === 'string' ? params.token : null} />
    </AuthPage>
  );
}
